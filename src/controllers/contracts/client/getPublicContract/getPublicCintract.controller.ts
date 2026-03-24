import { prisma } from "../../../../database/db";
import type { Request, Response } from "express";
import { logAuditEvent } from "../../../../services/audit/audit.service";
import { AuditActorType, AuditEventType } from "../../../../generated/prisma/enums";

export async function getPublicContract(req: Request, res: Response) {
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
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "El enlace expiró" });
    }

    if (contract.status === "SENT") {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "VIEWED" },
      });
      contract.status = "VIEWED";
    }

    try {
      const contractedSigner = contract.signers.find(
        (s) => s.partyRole === "CONTRACTED"
      );
      const contractedParty = contract.parties.find(
        (p) => p.role === "CONTRACTED"
      );

      await logAuditEvent({
        contractId: contract.id,
        signerId: contractedSigner?.id ?? null,
        eventType: AuditEventType.LINK_OPENED,
        actorType: AuditActorType.SIGNER,
        actorEmail:
          contractedSigner?.email ??
          contractedParty?.email ??
          null,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
        requestId:
          typeof req.headers["x-request-id"] === "string"
            ? req.headers["x-request-id"]
            : null,
        sessionId:
          typeof req.headers["x-session-id"] === "string"
            ? req.headers["x-session-id"]
            : null,
        metadata: {
          token,
          contractStatus: contract.status,
          contractType: contract.contractType,
          signerCount: contract.signers.length,
          hasLibranza: !!contract.libranzaData,
        },
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - LINK_OPENED:", auditError);
    }

    return res.json({ ok: true, contract });
  } catch (error) {
    console.error("GET PUBLIC CONTRACT ERROR:", error);
    return res.status(500).json({ ok: false, message: "No se pudo consultar el contrato" });
  }
}