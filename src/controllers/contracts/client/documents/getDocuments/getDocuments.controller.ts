import { Request, Response } from "express";
import { prisma } from "../../../../../database/db";

export async function getContractDocuments(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const contract = await prisma.contract.findUnique({
      where: { id: token },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        error: "Contrato no encontrado",
      });
    }

    const grouped = contract.documents.reduce<
      Record<
        string,
        {
          id: string;
          type: string;
          status: string;
          notes: string | null;
          fileUrl: string | null;
          fileName: string | null;
          mimeType: string | null;
          source: string | null;
          bytes: number | null;
          uploadedAt: Date | null;
          reviewedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }
      >
    >((acc, doc) => {
      acc[doc.type] = {
        id: doc.id,
        type: doc.type,
        status: doc.status,
        notes: doc.notes ?? null,
        fileUrl: doc.fileUrl ?? null,
        fileName: doc.fileName ?? null,
        mimeType: doc.mimeType ?? null,
        source: doc.source ?? null,
        bytes: doc.bytes ?? null,
        uploadedAt: doc.uploadedAt ?? null,
        reviewedAt: doc.reviewedAt ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };

      return acc;
    }, {});

    return res.json({
      ok: true,
      data: grouped,
    });
  } catch (error) {
    console.error("GET CONTRACT DOCUMENTS ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: "Error obteniendo documentos",
    });
  }
}