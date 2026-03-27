import { prisma } from "../../../../database/db";
import type { Response } from "express";
import {
  trackContractLinkOpened,
  trackContractViewed,
} from "../../../../services/audit/contract-audit.service";
import { getAuditRequestContext } from "../../../../utils/audit-request";
import { AuthenticatedRequest } from "../../../../types/types";

export async function getPublicContract(req: AuthenticatedRequest, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED", "SIGNED"] },
      },
      include: {
        parties: true,
        clauses: { orderBy: { position: "asc" } },
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: true,
        libranzaData: {
          include: {
            references: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!contract) {
      return res
        .status(404)
        .json({ ok: false, message: "Contrato no encontrado" });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res
        .status(400)
        .json({ ok: false, message: "El enlace expiró" });
    }

    const auditContext = getAuditRequestContext(req);

    const contractedSigner = contract.signers.find(
      (signer) => signer.partyRole === "CONTRACTED"
    );

    const contractedParty = contract.parties.find(
      (party) => party.role === "CONTRACTED"
    );

    const actorName = contractedSigner?.name ?? contractedParty?.name ?? null;
    const actorEmail =
      contractedSigner?.email ?? contractedParty?.email ?? null;

    const previousStatus = contract.status;

    const userRole = req.user?.role ?? null;
    const isInternalUser =
      userRole === "ADMIN" || userRole === "OPERATOR";

    if (contract.status === "SENT") {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "VIEWED" },
      });

      contract.status = "VIEWED";

      if (!isInternalUser) {
        try {
          await trackContractViewed({
            contractId: contract.id,
            signerId: contractedSigner?.id ?? null,
            actorName,
            actorEmail,
            ...auditContext,
            previousStatus,
            currentStatus: "VIEWED",
          });
        } catch (auditError) {
          console.error("AUDIT ERROR - CONTRACT_VIEWED:", auditError);
        }
      }
    }

    if (!isInternalUser) {
      try {
        await trackContractLinkOpened({
          contractId: contract.id,
          signerId: contractedSigner?.id ?? null,
          actorName,
          actorEmail,
          ...auditContext,
          contractStatus: contract.status,
          contractType: contract.contractType ?? "",
          signerCount: contract.signers.length,
          hasLibranza: !!contract.libranzaData,
        });
      } catch (auditError) {
        console.error("AUDIT ERROR - LINK_OPENED:", auditError);
      }
    }

    return res.json({ ok: true, contract });
  } catch (error) {
    console.error("GET PUBLIC CONTRACT ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo consultar el contrato",
    });
  }
}