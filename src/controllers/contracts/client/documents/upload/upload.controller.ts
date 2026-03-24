import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../../../../database/db";
import cloudinary from "../../../../../config/cloudinary";
import { logAuditEvent } from "../../../../../services/audit/audit.service";
import { AuditActorType, AuditEventType } from "../../../../../generated/prisma/enums";

type DocumentType =
  | "CEDULA_FRENTE"
  | "CEDULA_REVERSO"
  | "SELFIE"
  | "PDF_ADICIONAL"
  | "IMAGEN_GENERAL";

const VALID_TYPES: DocumentType[] = [
  "CEDULA_FRENTE",
  "CEDULA_REVERSO",
  "SELFIE",
  "PDF_ADICIONAL",
  "IMAGEN_GENERAL",
];

const TYPE_LABELS: Record<DocumentType, string> = {
  CEDULA_FRENTE: "Cédula frente",
  CEDULA_REVERSO: "Cédula reverso",
  SELFIE: "Selfie",
  PDF_ADICIONAL: "Documento adicional",
  IMAGEN_GENERAL: "Imagen",
};

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

function getDocumentEventType(docType: DocumentType): AuditEventType {
  switch (docType) {
    case "CEDULA_FRENTE":
      return AuditEventType.ID_FRONT_UPLOADED;
    case "CEDULA_REVERSO":
      return AuditEventType.ID_BACK_UPLOADED;
    case "SELFIE":
      return AuditEventType.SELFIE_UPLOADED;
    default:
      return AuditEventType.DOCUMENT_UPLOADED;
  }
}

function buildFileHashFromDataUrl(fileDataUrl: string) {
  const parts = fileDataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : "";
  const buffer = Buffer.from(base64, "base64");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

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
      include: {
        signers: {
          orderBy: { signerOrder: "asc" },
        },
        parties: true,
      },
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

    const fileHash = buildFileHashFromDataUrl(fileDataUrl);

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

    const folder = getFolderByType(contract.id, typedDocType);
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

    try {
      const contractedSigner = contract.signers.find(
        (s) => s.partyRole === "CONTRACTED"
      );
      const contractedParty = contract.parties.find(
        (p) => p.role === "CONTRACTED"
      );

      await logAuditEvent({
        contractId: contract.id,
        signerId: contractedSigner?.id ?? null,
        eventType: getDocumentEventType(typedDocType),
        actorType: AuditActorType.SIGNER,
        actorEmail: contractedSigner?.email ?? contractedParty?.email ?? null,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
        requestId:
          typeof req.headers["x-request-id"] === "string"
            ? req.headers["x-request-id"]
            : null,
        sessionId:
          typeof req.headers["x-session-id"] === "string"
            ? req.headers["x-session-id"]
            : null,
        documentHash: fileHash,
        metadata: {
          token,
          documentId: doc.id,
          docType: typedDocType,
          label: doc.label,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          url: doc.url,
          replacedPrevious: !!existing,
        },
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - DOCUMENT_UPLOADED:", auditError);
    }

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