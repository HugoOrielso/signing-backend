import fs from "fs";
import { Response } from "express";
import { prisma } from "../../../../../database/db";
import { getAuditRequestContext } from "../../../../../utils/audit-request";
import { trackContractDocumentUploaded } from "../../../../../services/audit/download-audit.service";
import {
  getFolderByType,
  isValidDocType,
  mapToContractDocumentType,
  updateContractStatusAfterUpload,
  uploadToCloudinary,
} from "../../../../../utils/uploads";
import { AuthenticatedRequest } from "../../../../../types/types";

export async function editDocument(req: AuthenticatedRequest, res: Response) {
  let tempFilePath: string | null = null;
    console.log("etnre")
  try {
    const token = req.params.token as string;
    console.log(token)
    const docTypeRaw = String(req.body.docType || req.body.type || "").trim();

    if (!isValidDocType(docTypeRaw)) {
      return res.status(400).json({
        ok: false,
        message: "Tipo inválido",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Archivo requerido",
      });
    }

    tempFilePath = req.file.path;

    if (!tempFilePath) {
      return res.status(400).json({
        ok: false,
        message: "Archivo temporal no encontrado",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id: token,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado o no disponible para actualización",
      });
    }

    const mappedType = mapToContractDocumentType(docTypeRaw);

    const document = await prisma.contractDocument.findUnique({
      where: {
        contractId_type: {
          contractId: contract.id,
          type: mappedType,
        },
      },
    });

    if (!document || !document.fileUrl) {
      return res.status(404).json({
        ok: false,
        message: "No existe un documento previo para actualizar",
      });
    }

    const folder = getFolderByType(contract.id, docTypeRaw);

    const uploadResult = await uploadToCloudinary(
      tempFilePath,
      folder,
      req.file.mimetype,
      req.file.originalname
    );

    const updatedDocument = await prisma.contractDocument.update({
      where: { id: document.id },
      data: {
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        source: "FILE_UPLOAD",

        status: "PENDING",
        notes: null,
        reviewedById: null,
        reviewedAt: null,

        uploadedAt: new Date(),
      },
    });

    await updateContractStatusAfterUpload(contract.id);

    try {
      const auditContext = getAuditRequestContext(req);

      await trackContractDocumentUploaded({
        contractId: contract.id,
        ...auditContext,
        docType: docTypeRaw,
        documentId: document.id,
        mimeType: req.file.mimetype,
        sizeBytes: uploadResult.bytes,
        label: req.file.originalname ?? "",
        documentHash: "",
        replacedPrevious: true,
      });
    } catch (e) {
      console.error("AUDIT ERROR:", e);
    }

    return res.status(200).json({
      ok: true,
      message: "Documento actualizado correctamente",
      document: {
        id: updatedDocument.id,
        type: updatedDocument.type,
        url: updatedDocument.fileUrl,
        mimeType: updatedDocument.mimeType,
        status: updatedDocument.status,
      },
    });
  } catch (error: unknown) {
    console.error("UPDATE DOCUMENT ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: "Error actualizando documento",
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}