import fs from "fs";
import { Response } from "express";
import { prisma } from "../../../../../database/db";
import { getAuditRequestContext } from "../../../../../utils/audit-request";
import { trackContractDocumentUploaded } from "../../../../../services/audit/download-audit.service";
import { BLOCKED_STATUSES, getFolderByType, isValidDocType, mapToContractDocumentType, updateContractStatusAfterUpload, uploadToCloudinary } from "../../../../../utils/uploads";


export async function uploadContractDocument(req: any, res: Response) {
  let tempFilePath: string | null = null;

  try {
    const token = req.params.token;
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
        status: {
          notIn: [...BLOCKED_STATUSES],
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado o no disponible",
      });
    }

    const mappedType = mapToContractDocumentType(docTypeRaw);

    // 🔥 Buscar o crear documento
    let document = await prisma.contractDocument.findUnique({
      where: {
        contractId_type: {
          contractId: contract.id,
          type: mappedType,
        },
      },
    });

    if (!document) {
      document = await prisma.contractDocument.create({
        data: {
          contractId: contract.id,
          type: mappedType,
        },
      });
    }

    const folder = getFolderByType(contract.id, docTypeRaw);

    const uploadResult = await uploadToCloudinary(
      tempFilePath,
      folder,
      req.file.mimetype,
      req.file.originalname
    );

    // 🔥 ACTUALIZAMOS EL DOCUMENTO (ya no hay uploads separados)
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
        status: "PENDING", // reset estado
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
        replacedPrevious: true, // siempre reemplaza ahora
      });
    } catch (e) {
      console.error("AUDIT ERROR:", e);
    }

    return res.status(201).json({
      ok: true,
      message: "Documento subido correctamente",
      document: {
        id: updatedDocument.id,
        type: updatedDocument.type,
        url: updatedDocument.fileUrl,
        mimeType: updatedDocument.mimeType,
      },
    });
  } catch (error: unknown) {
    console.error("UPLOAD ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: "Error subiendo documento",
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}