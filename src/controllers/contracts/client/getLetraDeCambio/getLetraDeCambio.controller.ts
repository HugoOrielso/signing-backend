import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";

export async function getLetraCambio(req: Request, res: Response) {
  try {
    const { token } = req.params as { token: string };

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        letraCambioData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    if (!contract.isSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse la libranza",
      });
    }

    if (!contract.pagareSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse el pagaré",
      });
    }

    if (!contract.isConformityReceiptSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse el recibo de conformidad",
      });
    }

    const letraCambio = await prisma.letraCambioData.upsert({
      where: {
        contractId: contract.id,
      },
      update: {},
      create: {
        contract: {
          connect: {
            id: contract.id,
          },
        },
      },
    });

    return res.json({
      ok: true,
      data: {
        ...letraCambio,
        isLetraCambioSigned: contract.isLetraCambioSigned,
        templateKey: contract.templateKey,
      },
    });
  } catch (error) {
    console.error("GET LETRA CAMBIO ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener la letra de cambio",
    });
  }
}