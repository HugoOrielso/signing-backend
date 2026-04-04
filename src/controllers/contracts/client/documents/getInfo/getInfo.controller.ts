import { prisma } from "../../../../../database/db";
import type { Request, Response } from "express";

export async function getInfo(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const contract = await prisma.contract.findFirst({
      where: { token },
      select: { id: true },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    return res.json({
      ok: true,
      documents: [],
    });
  } catch (error: any) {
    console.error("GET DOCUMENTS ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener documentos",
    });
  }
}