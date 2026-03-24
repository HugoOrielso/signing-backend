import cloudinary from "../../../../../config/cloudinary";
import { prisma } from "../../../../../database/db";
import type { Request, Response } from "express";

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
