import { buildContractData } from "./buildContractData";
import { buildParties } from "./buildParties";
import { buildLibranzaData } from "./buildLibranzaData";
import { prisma } from "../../../../../database/db";
import {
  trackContractCreated,
} from "../../../../../services/audit/contract-audit.service";
import { AdminRole } from "../../../../../generated/prisma/enums";
import { getAuditRequestContext } from "../../../../../utils/audit-request";
import { AuthenticatedRequest } from "../../../../../types/types";
import { CreateContractBody } from "../../../../../schemas/libranza/createContract.schema";

export async function createContractService(
  body: CreateContractBody,
  req: AuthenticatedRequest
) {
  const adminId = req.user?.id;
  if (!adminId) {
    throw new Error("Usuario no autenticado");
  }

  const auditContext = getAuditRequestContext(req);

  const isNewFormat = !body.generalData;
  const isLibranza = isNewFormat && body.contractType === "LIBRANZA";

  const contractData = buildContractData(body, isNewFormat);
  const partiesInput = buildParties(body, isNewFormat);

  const contractedParty = partiesInput.find((p) => p.role === "DEUDOR");

  const clausesInput =
    !isNewFormat && Array.isArray(body.clauses) ? body.clauses : [];

  const libranzaInput = isLibranza
    ? buildLibranzaData(body, contractedParty)
    : null;

  const templateKey = body.templateKey ?? "dimcultura";

  const contract = await prisma.contract.create({
    data: {
      ...contractData,
      adminId,
      templateKey,
      parties: {
        create: partiesInput.map((p) => ({
          role: p.role,
          name: p.name,
          identification: p.identification ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          address: p.address ?? null,
        })),
      },
      ...(clausesInput.length > 0
        ? {
            clauses: {
              create: clausesInput
                .filter((c) => c.content?.trim())
                .map((c, i: number) => ({
                  position: c.position ?? i + 1,
                  content: c.content,
                })),
            },
          }
        : {}),
      signers: {
        create: [
          {
            name: contractedParty?.name ?? "",
            email: contractedParty?.email ?? null,
            phone: contractedParty?.phone ?? null,
            partyRole: "DEUDOR",
            signerOrder: 1,
          },
        ],
      },
      ...(libranzaInput ? { libranzaData: { create: libranzaInput } } : {}),
    },
    include: { signers: true },
  });

  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.contract.update({
    where: { id: contract.id },
    data: { token, tokenExpiresAt },
  });

  try {
    await trackContractCreated({
      contractId: contract.id,
      adminId,
      actorRole: req.user?.role as AdminRole,
      actorEmail: req.user?.email ?? null,
      ...auditContext,
      title: contract.title,
      contractType: contract.contractType ?? "",
      contractNumber: contract.contractNumber ?? null,
      signerCount: contract.signers.length,
      hasLibranza: !!libranzaInput,
      format: isNewFormat ? "new" : "legacy",
      templateKey,
    });
  } catch (auditError) {
    console.error("AUDIT ERROR - CONTRACT_CREATED:", auditError);
  }

  return {
    contractId: contract.id,
    token,
  };
}