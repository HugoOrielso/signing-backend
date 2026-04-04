import { buildContractData } from "./buildContractData";
import { buildParties } from "./buildParties";
import { buildSigners } from "./buildSigners";
import { buildLibranzaData } from "./buildLibranzaData";
import { prisma } from "../../../../../database/db";
import { sendContractEmail, sendLibranzaEmail } from "../../../../../lib/email/sendContract";
import {
  trackContractCreated,
  trackContractSent,
  trackEmailFailed,
  trackEmailSendRequested,
  trackEmailSent,
} from "../../../../../services/audit/contract-audit.service";
import { AdminRole } from "../../../../../generated/prisma/enums";
import { getAuditRequestContext } from "../../../../../utils/audit-request";
import { AuthenticatedRequest } from "../../../../../types/types";
import { CreateContractBody } from "../../../../../schemas/libranza/createContract.schema";

export async function createContractService(body: CreateContractBody,
  req: AuthenticatedRequest) {
  const adminId = req.user?.id;
  if (!adminId) {
    throw new Error("Usuario no autenticado");
  }

  const auditContext = getAuditRequestContext(req);

  const isNewFormat = !body.generalData;
  const isLibranza = isNewFormat && body.contractType === "LIBRANZA";

  const contractData = buildContractData(body, isNewFormat);
  const partiesInput = buildParties(body, isNewFormat);
  const signersInput = buildSigners(body, isNewFormat);

  const contractedSigner = signersInput.find((s) => s.partyRole === "CONTRACTED");
  const contractedParty = partiesInput.find((p) => p.role === "CONTRACTED");

  const sendTo = isNewFormat
    ? contractedSigner?.email ?? contractedParty?.email ?? ""
    : body.generalData?.contractedEmail ?? "";

  const clienteNombre = isNewFormat
    ? contractedSigner?.name ?? contractedParty?.name ?? body.clienteNombre ?? ""
    : body.generalData?.contractedName ?? "";

  const asesor = body.asesor ?? undefined;

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
        create: signersInput.map((s, i) => ({
          name: s.name,
          email: s.email ?? null,
          phone: s.phone ?? null,
          roleTitle: s.roleTitle ?? null,
          partyRole: s.partyRole ?? null,
          signerOrder: s.signerOrder ?? i + 1,
        })),
      },
      ...(libranzaInput ? { libranzaData: { create: libranzaInput } } : {}),
    },
    include: { signers: true },
  });

  try {
    await trackContractCreated({
      contractId: contract.id,
      adminId,
      actorRole: req.user?.role as AdminRole,
      actorEmail: req.user?.email ?? null,
      ...auditContext,
      title: contract.title,
      contractType: contract.contractType ?? '',
      contractNumber: contract.contractNumber ?? null,
      signerCount: contract.signers.length,
      hasLibranza: !!libranzaInput,
      format: isNewFormat ? "new" : "legacy",
      templateKey,
    });
  } catch (auditError) {
    console.error("AUDIT ERROR - CONTRACT_CREATED:", auditError);
  }

  for (const [index, signer] of signersInput.entries()) {
    if (!signer.signed || !signer.sigType || !signer.sigData) continue;

    const dbSigner = contract.signers.find(
      (s) => s.signerOrder === (signer.signerOrder ?? index + 1)
    );

    if (!dbSigner) continue;

    await prisma.signature.create({
      data: {
        contractId: contract.id,
        signerId: dbSigner.id,
        type: signer.sigType === "canvas" ? "DRAWN" : "TYPED",
        typedValue: signer.sigType === "typed" ? signer.sigData : null,
        imageUrl: signer.sigType === "canvas" ? signer.sigData : null,
        signedAt: new Date(),
      },
    });
  }

  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.contract.update({
    where: { id: contract.id },
    data: { token, tokenExpiresAt, status: "SENT" },
  });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const signingLink = `${frontendUrl}/contracts/auth/${token}`;

  try {
    await trackContractSent({
      contractId: contract.id,
      adminId,
      actorRole: req.user?.role as AdminRole,
      actorEmail: req.user?.email ?? null,
      ...auditContext,
      sendTo: sendTo || null,
      clienteNombre: clienteNombre || null,
      signingLink,
      tokenExpiresAt,
      templateKey,
    });
  } catch (auditError) {
    console.error("AUDIT ERROR - CONTRACT_SENT:", auditError);
  }

  if (sendTo) {
    try {
      await trackEmailSendRequested({
        contractId: contract.id,
        adminId,
        actorRole: req.user?.role as AdminRole,
        actorEmail: req.user?.email ?? null,
        ...auditContext,
        to: sendTo,
        templateKey,
        provider: "resend",
      });

      if (isLibranza) {
        await sendLibranzaEmail({
          to: sendTo,
          clienteNombre,
          asesor,
          signingLink,
        });
      } else {
        await sendContractEmail({
          to: sendTo,
          contractTitle: contractData.title,
          contractorName:
            partiesInput.find((p) => p.role === "CONTRACTOR")?.name ?? "Contratante",
          signingLink,
        });
      }

      await trackEmailSent({
        contractId: contract.id,
        adminId,
        actorRole: req.user?.role as AdminRole,
        actorEmail: req.user?.email ?? null,
        ...auditContext,
        to: sendTo,
        templateKey,
        provider: "resend",
      });
    } catch (emailError: any) {
      try {
        await trackEmailFailed({
          contractId: contract.id,
          adminId,
          actorRole: req.user?.role as AdminRole,
          actorEmail: req.user?.email ?? null,
          ...auditContext,
          to: sendTo,
          templateKey,
          provider: "resend",
          errorMessage: emailError?.message ?? "Unknown email error",
        });
      } catch (auditError) {
        console.error("AUDIT ERROR - EMAIL_FAILED:", auditError);
      }

      console.error("EMAIL ERROR (contrato creado):", emailError?.message);
    }
  }

  return {
    contractId: contract.id,
    token,
    signingLink,
    emailSent: !!sendTo,
  };
}