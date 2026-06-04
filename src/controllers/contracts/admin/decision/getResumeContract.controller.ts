import { Request, Response } from "express";
import { getContractWithIdentityVerification, updateIdentityVerificationManually } from "../../../../services/admin/decision.service";
import { AuthenticatedRequest } from "../../../../types/types";

export async function getContractIdentityVerificationController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { contractId } = req.params as { contractId: string };

    const contract = await getContractWithIdentityVerification(contractId);

    return res.json({
      ok: true,
      contract,
    });
  } catch (error: any) {
    if (error.message === "CONTRACT_NOT_FOUND") {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo la verificación del contrato",
    });
  }
}

export async function updateIdentityVerificationManualController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { contractId } = req.params as { contractId: string };
    const { status, notes, rejectionReason, rawResponse } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        message: "El status es obligatorio",
      });
    }

    const result = await updateIdentityVerificationManually({
      contractId,
      status,
      notes,
      rejectionReason,
      rawResponse,
    });

    return res.json({
      ok: true,
      message: "Verificación actualizada correctamente",
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: "Error actualizando la verificación",
    });
  }
}