import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export const getContractById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const id = String(req.params.id);

    const contract = await prisma.contract.findUnique({
      where: {
        id,
        ...(role === "OPERATOR" && { adminId: userId }),
      },
      include: {
        parties: true,

        libranzaData: {
          include: {
            references: {
              orderBy: { createdAt: "asc" },
            },
          },
        },

        signers: { orderBy: { signerOrder: "asc" } },

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

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    return res.json({ ok: true, data: contract });
  } catch (error: any) {
    console.error("GET CONTRACT BY ID ERROR", error);
    return res.status(500).json({ ok: false, message: "Error al obtener el contrato" });
  }
};