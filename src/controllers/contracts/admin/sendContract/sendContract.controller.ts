import { prisma } from "../../../../database/db";
import { sendContractEmail } from "../../../../lib/email/sendSignedPagare";
import { generatePublicToken } from "../../../../lib/token/generateToken";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function sendContract(req: AuthenticatedRequest, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        adminId,
      },
      include: {
        parties: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    const contractedParty = contract.parties.find(
      (p) => p.role === "CONTRACTED"
    );

    const contractorParty = contract.parties.find(
      (p) => p.role === "CONTRACTOR"
    );

    if (!contractedParty?.email) {
      return res.status(400).json({
        ok: false,
        message: "El contratado no tiene email",
      });
    }

    const token = generatePublicToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        token,
        tokenExpiresAt,
        status: "SENT",
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const signingLink = `${frontendUrl}/contracts/sign/${token}`;
    await sendContractEmail({
      to: contractedParty.email,
      contractTitle: contract.title || contract.contractType || "Contrato",
      contractorName: contractorParty?.name || "Contratante",
      signingLink,
    });

    return res.json({
      ok: true,
      message: "Contrato enviado correctamente",
      signingLink,
    });
  } catch (error: any) {
    console.error("SEND CONTRACT ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo enviar el contrato",
      error: error?.message || "Error desconocido",
    });
  }
}
