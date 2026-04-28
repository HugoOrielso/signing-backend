import type { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "../../../../types/types";
import { createContractService } from "./services/createContract.service";
import { CreateContractBody, createContractSchema } from "../../../../schemas/libranza/createContract.schema";

export async function createContract(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const body: CreateContractBody = createContractSchema.parse(req.body);

    const result = await createContractService(body, req);

    return res.status(201).json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        message: "Datos inválidos para crear el contrato",
        errors: error.flatten(),
      });
    }

    const message =
      error instanceof Error && error.message === "Usuario no autenticado"
        ? "Usuario no autenticado"
        : error instanceof Error && error.message === "EXISTEN_LIBRANZAS_NO_FIRMADAS"
          ? "El cliente ya tiene una libranza activa sin firmar"
          : "No se pudo crear el contrato";

    const status =
      error instanceof Error && error.message === "Usuario no autenticado"
        ? 401
        : error instanceof Error && error.message === "EXISTEN_LIBRANZAS_NO_FIRMADAS"
          ? 400
          : 500;

    return res.status(status).json({
      ok: false,
      message,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}