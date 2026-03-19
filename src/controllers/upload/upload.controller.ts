import { Request, Response } from "express";
import { prisma } from "../../database/db";
import crypto from "node:crypto"
import cloudinary from "../../config/cloudinary";


type DocumentType =
  | "CEDULA_FRENTE" | "CEDULA_REVERSO"
  | "SELFIE" | "PDF_ADICIONAL" | "IMAGEN_GENERAL";

const VALID_TYPES: DocumentType[] = [
  "CEDULA_FRENTE", "CEDULA_REVERSO",
  "SELFIE", "PDF_ADICIONAL", "IMAGEN_GENERAL",
];

const TYPE_LABELS: Record<DocumentType, string> = {
  CEDULA_FRENTE: "Cédula frente",
  CEDULA_REVERSO: "Cédula reverso",
  SELFIE: "Selfie",
  PDF_ADICIONAL: "Documento adicional",
  IMAGEN_GENERAL: "Imagen",
};


export async function uploadContractDocument(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { docType, fileDataUrl, mimeType, sizeBytes } = req.body as {
      docType: string;
      fileDataUrl: string;
      mimeType?: string;
      sizeBytes?: number;
    };

    if (!VALID_TYPES.includes(docType as DocumentType)) {
      return res.status(400).json({
        ok: false,
        message: `Tipo inválido. Válidos: ${VALID_TYPES.join(", ")}`,
      });
    }

    if (!fileDataUrl?.startsWith("data:")) {
      return res.status(400).json({
        ok: false,
        message: "Archivo requerido (base64 data URL)",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED", "SIGNED"] },
      },
      select: { id: true, tokenExpiresAt: true },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        ok: false,
        message: "El enlace ha expirado",
      });
    }

    const typedDocType = docType as DocumentType;
    const isPdf =
      mimeType?.includes("pdf") ||
      fileDataUrl.startsWith("data:application/pdf");

    // ── Borrar documento anterior del mismo tipo ─────────────────────────────
    const existing = await prisma.contractDocument.findFirst({
      where: { contractId: contract.id, type: typedDocType },
    });

    if (existing) {
      try {
        if (existing.publicId) {
          await cloudinary.uploader.destroy(existing.publicId, {
            resource_type: "auto",
          });
        }

        await prisma.contractDocument.delete({
          where: { id: existing.id },
        });
      } catch (e) {
        console.warn("No se pudo borrar el doc anterior:", e);
      }
    }

    // ── Carpeta por contrato + tipo ──────────────────────────────────────────
    const folder = getFolderByType(contract.id, typedDocType);

    // Sufijo corto solo para evitar colisiones en Cloudinary
    const randomSuffix = crypto.randomUUID().slice(0, 8);

    const uploadResult = await cloudinary.uploader.upload(fileDataUrl, {
      folder,
      resource_type: "auto",
      public_id: `${typedDocType}-${Date.now()}-${randomSuffix}`,
      use_filename: false,
    });


    const doc = await prisma.contractDocument.create({
      data: {
        contractId: contract.id,
        type: typedDocType,
        label: TYPE_LABELS[typedDocType],
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        mimeType: mimeType ?? (isPdf ? "application/pdf" : "image/jpeg"),
        sizeBytes: sizeBytes ?? uploadResult.bytes,
      },
    });

    return res.status(201).json({
      ok: true,
      document: {
        id: doc.id,
        type: doc.type,
        label: doc.label,
        url: doc.url,
      },
    });
  } catch (error: any) {
    console.error("UPLOAD DOCUMENT ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo subir el documento",
      error: error?.message ?? "Error desconocido",
    });
  }
}

// ── GET /contracts/public/:token/documents ────────────────────────────────────
export async function getContractDocuments(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const contract = await prisma.contract.findFirst({
      where: { token },
      select: { id: true },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    const documents = await prisma.contractDocument.findMany({
      where: { contractId: contract.id },
      orderBy: { uploadedAt: "asc" },
      select: { id: true, type: true, label: true, url: true, mimeType: true, sizeBytes: true, uploadedAt: true },
    });

    return res.json({ ok: true, documents });

  } catch (error: any) {
    console.error("GET DOCUMENTS ERROR:", error);
    return res.status(500).json({ ok: false, message: "Error al obtener documentos" });
  }
}

// ── GET /contracts/public/:token/documents/:docId/view ────────────────────────
export async function viewContractDocument(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const docId = Array.isArray(req.params.docId) ? req.params.docId[0] : req.params.docId;

    const contract = await prisma.contract.findFirst({
      where: { token: token as string },
      select: { id: true },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    const doc = await prisma.contractDocument.findFirst({
      where: { id: docId as string, contractId: contract.id },
    });

    if (!doc?.publicId) {
      return res.status(404).json({ ok: false, message: "Documento no encontrado" });
    }

    const fullPublicId = doc.publicId.includes("/")
      ? doc.publicId
      : `contract-signing/${doc.publicId}`;

    const isPdf = doc.mimeType?.includes("pdf");

    const url = cloudinary.url(fullPublicId, {
      resource_type: isPdf ? "image" : "image",
      type: "upload",
      secure: true,
      format: isPdf ? "pdf" : undefined,
    });

    return res.redirect(302, url);
  } catch (error: any) {
    console.error("VIEW DOCUMENT ERROR:", error);
    return res.status(500).json({ ok: false, message: "Error al obtener el documento" });
  }
}

function getFolderByType(contractId: string, docType: DocumentType) {
  switch (docType) {
    case "CEDULA_FRENTE":
    case "CEDULA_REVERSO":
      return `contracts/${contractId}/id-documents`;

    case "SELFIE":
      return `contracts/${contractId}/selfies`;

    case "PDF_ADICIONAL":
      return `contracts/${contractId}/pdfs`;

    case "IMAGEN_GENERAL":
      return `contracts/${contractId}/images`;

    default:
      return `contracts/${contractId}/misc`;
  }
}