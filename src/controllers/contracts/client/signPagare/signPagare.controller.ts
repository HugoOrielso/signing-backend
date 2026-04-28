import { prisma } from "../../../../database/db";
import type { Request, Response } from "express";
import crypto from "crypto";
import cloudinary from "../../../../config/cloudinary";
import { sendSignedPagarePdf } from "../../../../services/pdf/sendSignedPagare.controller";
import { getPublicAuditContext, safeAudit } from "../../../../helpers/udit";
import { trackPagareSigned } from "../../../../services/audit/contract-audit.service";

export async function signPagare(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { type, typedValue, imageUrl } = req.body as {
      type: "TYPED" | "DRAWN";
      typedValue?: string;
      imageUrl?: string;
    };

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "Token requerido",
      });
    }

    if (!["TYPED", "DRAWN"].includes(type)) {
      return res.status(400).json({
        ok: false,
        message: "Tipo de firma inválido",
      });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Valor de firma requerido",
      });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "Imagen de firma inválida",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        token,
      },
      select: {
        id: true,
        title: true,
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 1,
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }




    const pagare = await prisma.pagare.findUnique({
      where: {
        contractId: contract.id,
      },
      include: {
        signature: true,
      },
    });

    if (!pagare) {
      return res.status(404).json({
        ok: false,
        message: "Pagaré no encontrado",
      });
    }

    if (pagare.isSigned || pagare.signature) {
      return res.status(400).json({
        ok: false,
        message: "El pagaré ya fue firmado",
      });
    }

    const signedAt = new Date();

    const hashPayload = {
      pagareId: pagare.id,
      number: pagare.number,
      deudorNombre: pagare.deudorNombre,
      deudorDocumento: pagare.deudorDocumento,
      valorTotal: pagare.valorTotal,
      numeroCuotas: pagare.numeroCuotas,
      valorCuota: pagare.valorCuota,
      fechaPrimeraCuota: pagare.fechaPrimeraCuota,
      ciudadPago: pagare.ciudadPago,
      ciudadFirma: pagare.ciudadFirma,
      signedAt: signedAt.toISOString(),
      type,
      typedValue: type === "TYPED" ? typedValue?.trim() ?? null : null,
    };

    const documentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(hashPayload))
      .digest("hex");

    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: `pagares/${pagare.id}/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const signature = await tx.pagareSignature.create({
        data: {
          pagareId: pagare.id,
          type,
          typedValue: type === "TYPED" ? typedValue?.trim() ?? null : null,
          imageUrl: uploadedSignatureUrl,
          signaturePublicId: uploadedSignaturePublicId,
          signedAt,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
          documentHash,
        },
      });

      const updatedPagare = await tx.pagare.update({
        where: { id: pagare.id },
        data: {
          isSigned: true,
          status: "SIGNED",
          signedAt,
          fechaSuscripcion: pagare.fechaSuscripcion ?? signedAt,
        },
      });

      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "SIGNED",
          isSigned: true
        },
      });

      return { signature, updatedPagare, updatedContract };

    });

    const signer = contract.signers[0] ?? null;

    await safeAudit(() =>
      trackPagareSigned({
        contractId: contract.id,
        pagareId: pagare.id,
        pagareNumber: pagare.number,
        actorName: signer?.name ?? pagare.deudorNombre ?? null,
        actorEmail: signer?.email ?? null,
        signatureType: type,
        signedAt: signedAt.toISOString(),
        documentHash,
        imageUrl: uploadedSignatureUrl,
        ...getPublicAuditContext(req),
      })
    );

    try {
      await sendSignedPagarePdf(pagare.id);
    } catch (emailError) {
      console.error("SEND SIGNED PAGARE PDF ERROR", emailError);
    }

    return res.json({
      ok: true,
      message: "Pagaré firmado correctamente",
      pagareId: pagare.id,
      pagareNumber: result.updatedPagare.number,
      signedAt: result.updatedPagare.signedAt,
      status: result.updatedPagare.status,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });
  } catch (error) {
    console.error("SIGN PAGARE ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar el pagaré",
    });
  }
}