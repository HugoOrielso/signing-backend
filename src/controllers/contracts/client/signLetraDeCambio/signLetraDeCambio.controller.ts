import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";
import cloudinary from "../../../../config/cloudinary";
import crypto from "node:crypto";
import { sendSignedLetraCambioPdf } from "../../../../services/pdf/sendSignedLetraDeCambio";

export async function signLetraCambio(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { type, sigData, typedValue } = req.body as {
      type: "DRAWN" | "TYPED";
      sigData?: string;
      typedValue?: string;
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

    if (type === "DRAWN" && !sigData?.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "Imagen de firma inválida",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        letraCambioData: true,
        reciboConformidadData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    if (!contract.isSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse la libranza",
      });
    }

    if (!contract.pagareSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse el pagaré",
      });
    }

    if (!contract.isConformityReceiptSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse el recibo de conformidad",
      });
    }

    if (contract.isLetraCambioSigned) {
      return res.status(400).json({
        ok: false,
        message: "La letra de cambio ya fue firmada",
      });
    }

    const signedAt = new Date();

    let uploadedSignatureUrl: string | null = null;

    if (type === "DRAWN" && sigData) {
      const uploadResult = await cloudinary.uploader.upload(sigData, {
        folder: `contracts/${contract.id}/letra-cambio/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
    }

    const signedIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const signedUserAgent = req.headers["user-agent"] ?? null;

    const hashPayload = {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      consecutivo: contract.consecutivo,
      letraCambioId: contract.letraCambioData?.id ?? null,
      signedAt: signedAt.toISOString(),
      type,
      typedValue: type === "TYPED" ? typedValue?.trim() ?? null : null,
      signedIp,
      signedUserAgent,
    };

    const documentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(hashPayload))
      .digest("hex");

    const result = await prisma.$transaction(async (tx) => {
      const letraCambio = await tx.letraCambioData.upsert({
        where: {
          contractId: contract.id,
        },
        create: {
          contract: {
            connect: {
              id: contract.id,
            },
          },
          fechaFirma: signedAt,
          tipoFirma: type,
          firmaTexto: type === "TYPED" ? typedValue?.trim() ?? null : null,
          firmaImagenUrl: uploadedSignatureUrl,
          signedIp,
          signedUserAgent,
        },
        update: {
          fechaFirma: signedAt,
          tipoFirma: type,
          firmaTexto: type === "TYPED" ? typedValue?.trim() ?? null : null,
          firmaImagenUrl: uploadedSignatureUrl,
          signedIp,
          signedUserAgent,
        },
      });

      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: {
          isLetraCambioSigned: true,
          status: "SIGNED",
        },
      });

      return {
        letraCambio,
        updatedContract,
      };
    });

    try {
      await sendSignedLetraCambioPdf(result.letraCambio.id);
    } catch (pdfError) {
      console.error("SEND SIGNED LETRA CAMBIO PDF ERROR", pdfError);
    }

    return res.json({
      ok: true,
      message: "Letra de cambio firmada correctamente",
      contractId: contract.id,
      status: result.updatedContract.status,
      signedAt,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });
  } catch (error) {
    console.error("SIGN LETRA CAMBIO ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar la letra de cambio",
    });
  }
}