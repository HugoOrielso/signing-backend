import type { Response } from "express";
import { prisma } from "../../database/db";
import { getAuditTrailByContractId, verifyAuditTrail } from "../../services/audit/audit.service";
import { AuthenticatedRequest } from "../../types/types";

export async function getContractAuditTrail(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const contractId = String(req.params.id);

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        title: true,
        contractNumber: true,
        contractType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tokenExpiresAt: true,
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            partyRole: true,
            signerOrder: true,
          },
          orderBy: { signerOrder: "asc" },
        },
        parties: {
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    const events = await getAuditTrailByContractId(contractId);
    const verification = await verifyAuditTrail(contractId);

    const summary = {
      totalEvents: events.length,
      firstEventAt: events[0]?.createdAt ?? null,
      lastEventAt: events[events.length - 1]?.createdAt ?? null,
      lastEventHash: events[events.length - 1]?.eventHash ?? null,
      valid: verification.valid,
      signedEvent: events.find((e) => e.eventType === "CONTRACT_SIGNED") ?? null,
      otpVerifiedEvent: events.find((e) => e.eventType === "OTP_VERIFIED") ?? null,
      linkOpenedEvent: events.find((e) => e.eventType === "LINK_OPENED") ?? null,
    };

    return res.json({
      ok: true,
      contract,
      summary,
      verification,
      events,
    });
  } catch (error: any) {
    console.error("GET AUDIT TRAIL ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener la trazabilidad",
      error: error?.message ?? "Error desconocido",
    });
  }
}