import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function getLibranza(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;

    if (!id) {
      return res.status(400).json({ ok: false, message: "Faltan datos por enviar" });
    }

    const contracts = await prisma.contract.findMany({
      where: { id },
      orderBy: { createdAt: "desc" },
      include: {
        parties: true,
        libranzaData: {
          include: {
            references: true,
          },
        },
        signers: {
          orderBy: { signerOrder: "asc" },
        },
        signatures: {
          select: {
            id: true,
            signerId: true,
            type: true,
            typedValue: true,
            signedAt: true,
          },
        },
      },
    });

    return res.json({ ok: true, data: contracts });
  } catch (error: any) {
    console.error("LIST CONTRACTS ERROR", error);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudieron obtener los contratos" });
  }
}