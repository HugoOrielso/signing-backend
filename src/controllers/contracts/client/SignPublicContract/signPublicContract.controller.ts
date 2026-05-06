import { prisma } from "../../../../database/db";
import type { Request, Response } from "express";
import crypto from "crypto";
import cloudinary from "../../../../config/cloudinary";
import {
  trackContractSigned,
  trackContractStatusChange,
} from "../../../../services/audit/contract-audit.service";
import { getAuditRequestContext } from "../../../../utils/audit-request";
import { sendSignedContractPdf } from "../../../../services/pdf/sendSignedPdf";
import { getRequestContext } from "../../../../utils/requestContext";

export async function signPublicContract(req: Request, res: Response) {
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
        message: "Tipo inválido",
      });
    }

    const contract = await prisma.contract.findUnique({
      where: { token },
      include: {
        parties: true,
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: true,
        libranzaData: {
          include: {
            references: { orderBy: { createdAt: "asc" } },
          },
        },
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
        message: "El enlace expiró",
      });
    }

    const signer = contract.signers.find((s) => s.partyRole === "DEUDOR");

    if (!signer) {
      return res.status(400).json({
        ok: false,
        message: "Firmante inválido",
      });
    }

    const alreadySigned =
      contract.signatures.some((sig) => sig.signerId === signer.id) ||
      contract.status === "SIGNED" ||
      contract.isSigned === true;

    if (alreadySigned) {
      return res.status(400).json({
        ok: false,
        message: "Ya firmado",
      });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Firma requerida",
      });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "Imagen inválida",
      });
    }

    const auditContext = getAuditRequestContext(req);
    const previousStatus = contract.status;
    const signedAt = new Date();

    const documentHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          contractId: contract.id,
          signedAt: signedAt.toISOString(),
        })
      )
      .digest("hex");

    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: `contracts/${contract.id}/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    const context = getRequestContext(req);

    console.log("REQUEST CONTEXT DEBUG", {
      ip: context.ipAddress,
      raw: {
        ip: req.ip,
        ips: req.ips,
        remoteAddress: req.socket.remoteAddress,
        xForwardedFor: req.headers["x-forwarded-for"],
        xRealIp: req.headers["x-real-ip"],
      },
    });
    const createdSignature = await prisma.signature.create({
      data: {
        contractId: contract.id,
        signerId: signer.id,
        type,
        typedValue: type === "TYPED" ? typedValue : null,
        imageUrl: uploadedSignatureUrl,
        signaturePublicId: uploadedSignaturePublicId,
        signedAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        documentHash,
      },
    });

    try {
      await trackContractSigned({
        contractId: contract.id,
        signerId: signer.id,
        actorName: signer.name ?? null,
        actorEmail: signer.email ?? null,
        ...auditContext,
        signatureId: createdSignature.id,
        signatureType: type,
        otpVerified: req.headers["x-otp-verified"] === "true",
        documentHash,
        signedAt: signedAt.toISOString(),
        signerOrder: signer.signerOrder,
        previousStatus,
      });
    } catch (e) {
      console.error("AUDIT SIGN ERROR:", e);
    }

    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id },
      include: { signatures: true },
    });

    const allSigned = allSigners
      .filter((s) => s.partyRole === "DEUDOR")
      .every((s) => s.signatures.length > 0);

    const updatedContract = await prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "READY_TO_SIGN",
          isSigned: true,
        },
      });

      if (allSigned && contract.libranzaData) {
        const existingPagare = await tx.pagare.findUnique({
          where: { contractId: contract.id },
          select: { id: true, number: true },
        });

        if (!existingPagare) {
          const d = contract.libranzaData;

          await tx.pagare.create({
            data: {
              contractId: contract.id,
              libranzaDataId: d.id,

              status: "DRAFT",
              libranzaToken: contract.token ?? '',
              ciudadFirma: d.ciudad ?? null,
              fechaSuscripcion: null,
              fechaPrimeraCuota: d.mesCobro ?? null,
              ciudadPago: d.ciudad ?? null,

              acreedorNombre: contract.templateKey,
              acreedorNit: "901027654-2",

              deudorNombre: d.clienteNombre ?? "",
              deudorDocumento: d.clienteCC ?? "",
              deudorDocumentoDe: d.clienteCCDe ?? "",
              deudorDireccion: d.clienteDireccion ?? "",
              deudorTelefono: d.clienteTelefono ?? "",
              deudorEmail: d.clienteEmail ?? "",

              valorTotal: d.sumaTotal ?? 0,
              numeroCuotas: d.numeroCuotas ?? 0,
              valorCuota: d.valorCuota ?? 0,

              interesCorriente: null,
              interesMora: null,
              signedAt: null,
            },
          });
        }
      }

      return updated;
    });

    try {
      await trackContractStatusChange({
        contractId: contract.id,
        signerId: signer.id,
        actorName: signer.name ?? null,
        actorEmail: signer.email ?? null,
        ...auditContext,
        previousStatus,
        newStatus: updatedContract.status,
        allSigned,
        totalSigners: allSigners.length,
        signedSigners: allSigners.filter((s) => s.signatures.length > 0).length,
      });
    } catch (e) {
      console.error("AUDIT STATUS ERROR:", e);
    }

    if (allSigned) {
      try {
        await sendSignedContractPdf(contract.id);
      } catch (e) {
        console.error("EMAIL ERROR:", e);
      }
    }

    return res.json({
      ok: true,
      status: updatedContract.status,
      documentHash,
      imageUrl: uploadedSignatureUrl,
      pagareCreated: allSigned,
    });
  } catch (error) {
    console.error("SIGN ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar la libranza",
    });
  }
}


export async function signLibranzaPrueba(req: Request, res: Response) {

  try {
    await sendSignedContractPdf("7c226516-91b6-4d6f-92f6-9e2062bf3cf7");
  } catch (e) {
    console.error("EMAIL ERROR:", e);
  }

  return res.json({
    ok: true,
  });


}