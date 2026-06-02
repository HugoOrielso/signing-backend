import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";
import cloudinary from "../../../../config/cloudinary";
import crypto from 'node:crypto'
import { sendSignedReciboPdf } from "../../../../services/pdf/sendSignedRecibo";

export async function signConformityReceipt(req: Request, res: Response) {
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
        reciboConformidadData: true,
        libranzaData: {
          select: {
            productos: true,
          },
        },
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

    if (!contract.isSigned) {
      return res.status(400).json({
        ok: false,
        message: "Primero debe firmarse la libranza",
      });
    }

    if (contract.isConformityReceiptSigned) {
      return res.status(400).json({
        ok: false,
        message: "El recibo de conformidad ya fue firmado",
      });
    }

    const signedAt = new Date();

    const hashPayload = {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      consecutivo: contract.consecutivo,
      reciboConformidadId: contract.reciboConformidadData?.id ?? null,
      clienteNombre: contract.reciboConformidadData?.clienteNombre ?? null,
      clienteCC: contract.reciboConformidadData?.clienteCC ?? null,
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

    if (type === "DRAWN" && sigData) {
      const uploadResult = await cloudinary.uploader.upload(sigData, {
        folder: `contracts/${contract.id}/conformity-receipt/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const reciboConformidad = await tx.reciboConformidadData.upsert({
        where: {
          contractId: contract.id,
        },
        create: {
          contract: {
            connect: {
              id: contract.id,
            },
          },
          clienteNombre:
            contract.reciboConformidadData?.clienteNombre ?? "Cliente",
          clienteCC: contract.reciboConformidadData?.clienteCC ?? null,
          clienteEmail: contract.reciboConformidadData?.clienteEmail ?? null,
          ciudad: contract.reciboConformidadData?.ciudad ?? null,
          textoRecibido: contract.reciboConformidadData?.textoRecibido ?? null,

          fechaFirma: signedAt,
          tipoFirma: type,
          firmaTexto: type === "TYPED" ? typedValue?.trim() ?? null : null,
          firmaImagenUrl: uploadedSignatureUrl,
        },
        update: {
          fechaFirma: signedAt,
          tipoFirma: type,
          firmaTexto: type === "TYPED" ? typedValue?.trim() ?? null : null,
          firmaImagenUrl: uploadedSignatureUrl,
        },
      });

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
        },
        update: {},
      });

      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: {
          isConformityReceiptSigned: true,
          isLetraCambioSigned: false,
        },
      });

      return {
        reciboConformidad,
        letraCambio,
        updatedContract,
      };
    });

    try {
      // Cambia esta función por la tuya real si tiene otro nombre
      await sendSignedReciboPdf(result.reciboConformidad.id)
    } catch (pdfError) {
      console.error("SEND SIGNED CONFORMITY RECEIPT PDF ERROR", pdfError);
    }

    return res.json({
      ok: true,
      message: "Recibo de conformidad firmado correctamente",
      contractId: contract.id,
      status: result.updatedContract.status,
      signedAt,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });
  } catch (error) {
    console.error("SIGN CONFORMITY RECEIPT ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar el recibo de conformidad",
    });
  }
}

export async function testRecibo(req: Request, res: Response) {

  try {
    // Cambia esta función por la tuya real si tiene otro nombre
    await sendSignedReciboPdf(
      "cmot3d7tt000180vqzay95dp2"
    )
  } catch (pdfError) {
    console.error("SEND SIGNED CONFORMITY RECEIPT PDF ERROR", pdfError);
  }

  return res.status(200)
}




export async function getConformityReceipt(req: Request, res: Response) {
  try {
    const { token } = req.params as { token: string };

    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        reciboConformidadData: true,
        libranzaData: {
          select: {
            productos: true,
          },
        },
      },
    });

    if (!contract || !contract.reciboConformidadData) {
      return res.status(404).json({
        ok: false,
        message: "Recibo no encontrado",
      });
    }

    return res.json({
      ok: true,
      data: {
        ...contract.reciboConformidadData,
        productos: contract.libranzaData?.productos ?? [],
        isConformityReceiptSigned: contract.isConformityReceiptSigned,
        templateKey: contract.templateKey,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error al obtener el recibo",
    });
  }
}