import { Response } from "express";
import { AuthenticatedRequest } from "../../../../../types/types";
import { prisma } from "../../../../../database/db";
import { sendUserDataApprovedEmail, sendUserDataRejectedEmail } from "../../../../../services/pdf/reviewDocumentsEmail";

export async function reviewContractUserData(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const contractId = req.params.id as string;
    const { decision, notes } = req.body as {
      decision?: "APPROVED" | "REJECTED";
      notes?: string;
    };

    if (!contractId || !req.user) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos por enviar",
      });
    }

    if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({
        ok: false,
        message: "Decisión inválida",
      });
    }

    if (decision === "REJECTED" && !notes?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Las notas son obligatorias al rechazar los datos",
      });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        status: true,
        libranzaData: {
          select: {
            clienteNombre: true,
            clienteEmail: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    const docs = await prisma.contractDocument.findMany({
      where: { contractId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!docs.length) {
      return res.status(400).json({
        ok: false,
        message: "El contrato no tiene documentos para validar",
      });
    }

    const allApproved = docs.every((doc) => doc.status === "APPROVED");

    if (decision === "APPROVED" && !allApproved) {
      return res.status(400).json({
        ok: false,
        message: "No todos los documentos están aprobados",
      });
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        dataReviewStatus: decision,
        dataReviewNotes: decision === "REJECTED" ? notes?.trim() : null,
        status:
          decision === "APPROVED"
            ? "READY_TO_SIGN"
            : "PENDING_VERIFICATION",
      },
    });

    const clienteEmail = contract.libranzaData?.clienteEmail;
    const clienteNombre = contract.libranzaData?.clienteNombre || "cliente";

    let emailSent = true;

    if (clienteEmail) {
      try {
        if (decision === "APPROVED") {
          await sendUserDataApprovedEmail({
            to: clienteEmail,
            clienteNombre,
          });
        } else {
          await sendUserDataRejectedEmail({
            to: clienteEmail,
            clienteNombre,
            notes: notes?.trim() || "",
          });
        }
      } catch (emailError) {
        emailSent = false;
        console.error("Error enviando correo de notificación:", emailError);
      }
    } else {
      emailSent = false;
      console.warn(
        `No se envió correo porque el contrato ${contractId} no tiene clienteEmail`
      );
    }

    return res.json({
      ok: true,
      emailSent,
      message:
        decision === "APPROVED"
          ? "Los datos del usuario fueron aprobados correctamente"
          : "Los datos del usuario fueron rechazados correctamente",
      contract: updatedContract,
    });
  } catch (error) {
    console.error("reviewContractUserData error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}