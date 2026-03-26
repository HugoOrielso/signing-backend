import type { Response } from "express";
import { AuthenticatedRequest } from "../../../../types/types";
import { createContractService } from "./services/createContract.service";

export async function createContract(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await createContractService(req.body, req);

    return res.status(201).json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    const message =
      error?.message === "Usuario no autenticado"
        ? "Usuario no autenticado"
        : "No se pudo crear el contrato";

    const status = error?.message === "Usuario no autenticado" ? 401 : 500;

    return res.status(status).json({
      ok: false,
      message,
      error: error?.message ?? "Error desconocido",
    });
  }
}