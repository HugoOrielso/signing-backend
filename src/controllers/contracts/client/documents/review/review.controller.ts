import { Response } from "express";
import { AuthenticatedRequest } from "../../../../../types/types";
import { prisma } from "../../../../../database/db";
import { sendReadyToSignEmail } from "../../../../../lib/email/sendAlertDocumentsApproved";
import { trackReviewAction } from "../../../../../services/audit/contract-audit.service";
import { AdminRole } from "../../../../../generated/prisma/enums";

export async function reviewContractDocument(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const id = req.params.id as string;

    if (!id || !req.user) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos por enviar",
      });
    }

    const { status, notes } = req.body as {
      status?: "APPROVED" | "REJECTED";
      notes?: string;
    };

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Estado inválido",
      });
    }

    if (status === "REJECTED" && !notes?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Las notas son obligatorias al rechazar",
      });
    }

    const existing = await prisma.contractDocument.findUnique({
      where: { id },
      select: {
        id: true,
        contractId: true,
        status: true,
        contract:true
      },
    });

    if (!existing) {
      return res.status(404).json({
        ok: false,
        message: "Documento no encontrado",
      });
    }

    // ✅ Regla principal:
    // solo se puede aprobar o rechazar si el documento está en PENDING
    if (existing.status !== "PENDING") {
      return res.status(400).json({
        ok: false,
        message:
          existing.status === "REJECTED"
            ? "Un documento rechazado no puede pasar directamente a aprobado. Debe volver a subirse y quedar en pendiente."
            : "Solo se pueden revisar documentos en estado pendiente",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.contractDocument.update({
        where: { id },
        data: {
          status,
          notes: status === "REJECTED" ? notes!.trim() : null,
          reviewedAt: new Date(),
          reviewedById: req.user!.id,
        },
      });

      if (status === "REJECTED") {
        await tx.contract.update({
          where: { id: existing.contractId },
          data: {
            status: "PENDING_DOCUMENTS",
          },
        });

        return document;
      }

      // Si fue aprobado, revisar el estado de todos los documentos del contrato
      const allDocs = await tx.contractDocument.findMany({
        where: { contractId: existing.contractId },
        select: {
          id: true,
          status: true,
        },
      });

      const allApproved =
        allDocs.length > 0 && allDocs.every((doc) => doc.status === "APPROVED");

      if (allApproved) {
        await tx.contract.update({
          where: { id: existing.contractId },
          data: { status: "PENDING_VERIFICATION" },
        });

        // Obtener email del contratado
        const contractedParty = await tx.contractParty.findFirst({
          where: {
            contractId: existing.contractId,
            role: "DEUDOR",
          },
          select: { email: true, name: true },
        });

        if (contractedParty?.email) {
          try {
            await sendReadyToSignEmail({
              to: contractedParty.email,
              clienteNombre: contractedParty.name,
              templateKey: existing.contract.templateKey
            });
          } catch (emailError) {
            console.error("EMAIL ERROR - READY_TO_SIGN:", emailError);
          }
        }
      } else {
        await tx.contract.update({
          where: { id: existing.contractId },
          data: { status: "PENDING_VERIFICATION" },
        });
      }

      return document;
    });

    await trackReviewAction({
      contractId: existing.contractId,
      adminId: req.user.id,
      actorRole: req.user.role as AdminRole ?? "CREDIT_ANALYST",
      actorEmail: req.user.email,
      target: "DOCUMENT",
      status: status,
      notes: notes,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      ok: true,
      message:
        status === "APPROVED"
          ? "Documento aprobado correctamente"
          : "Documento rechazado correctamente",
      document: result,
    });
  } catch (error) {
    console.error("reviewContractDocument error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}