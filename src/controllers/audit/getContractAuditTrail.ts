import type { Response } from "express";
import { prisma } from "../../database/db";
import {
  getAuditTrailByContractId,
  verifyAuditTrail,
} from "../../services/audit/audit.service";
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

    return res.json({
      ok: true,
      contract,
      summary: {
        totalEvents: events.length,
        firstEventAt: events[0]?.createdAt ?? null,
        lastEventAt: events[events.length - 1]?.createdAt ?? null,
        lastEventHash: events[events.length - 1]?.eventHash ?? null,
        valid: verification.valid,
      },
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