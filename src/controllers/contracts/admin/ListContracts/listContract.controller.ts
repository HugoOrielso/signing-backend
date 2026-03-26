import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function listContracts(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const contracts = await prisma.contract.findMany({
      where: req.user?.role === "ADMIN" ? undefined : { adminId },
      orderBy: { createdAt: "desc" },
      include: {
        parties: true,
        libranzaData: true,
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