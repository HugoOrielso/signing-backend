import { prisma } from "../../../../database/db";
import { sendSignedContractEmail } from "../../../../lib/email/sendContract";
import { logAuditEvent } from "../../../../services/audit/audit.service";
import type { Request, Response } from "express";
import crypto from "crypto";
import cloudinary from "../../../../config/cloudinary";
import { AuditActorType, AuditEventType } from "../../../../generated/prisma/enums";

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

    if (!type || !["TYPED", "DRAWN"].includes(type)) {
      return res.status(400).json({
        ok: false,
        message: "El tipo de firma es requerido y debe ser TYPED o DRAWN",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: { token, status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] } },
      include: {
        signers: true,
        signatures: true,
        parties: true,
        libranzaData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado o ya no disponible para firma",
      });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        ok: false,
        message: "El enlace expiró",
      });
    }

    const signer = contract.signers.find((s) => s.partyRole === "CONTRACTED");
    if (!signer) {
      return res.status(400).json({
        ok: false,
        message: "No existe un firmante público válido",
      });
    }

    const alreadySigned = contract.signatures.some((sig) => sig.signerId === signer.id);
    if (alreadySigned) {
      return res.status(400).json({
        ok: false,
        message: "Este contrato ya fue firmado por la otra parte",
      });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "La firma escrita es requerida",
      });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "La imagen de la firma es requerida y debe ser válida",
      });
    }

    const previousStatus = contract.status;
    const signedAt = new Date();

    const documentContent = JSON.stringify({
      contractId: contract.id,
      contractTitle: contract.title,
      libranzaData: contract.libranzaData,
      signedAt: signedAt.toISOString(),
    });

    const documentHash = crypto
      .createHash("sha256")
      .update(documentContent)
      .digest("hex");

    const signerEmail =
      signer.email ??
      contract.parties.find((p) => p.role === "CONTRACTED")?.email ??
      null;

    const otpVerified = req.headers["x-otp-verified"] === "true";

    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;
    let uploadedSignatureMimeType: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const folder = getSignatureFolder(contract.id);

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder,
        resource_type: "image",
        public_id: `signature-${signer.id}-${Date.now()}-${randomSuffix}`,
        use_filename: false,
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
      uploadedSignatureMimeType = uploadResult.format
        ? `image/${uploadResult.format}`
        : "image/png";
    }

    const createdSignature = await prisma.signature.create({
      data: {
        contractId: contract.id,
        signerId: signer.id,
        type,
        typedValue: type === "TYPED" ? typedValue!.trim() : null,
        imageUrl: type === "DRAWN" ? uploadedSignatureUrl : null,
        signaturePublicId: type === "DRAWN" ? uploadedSignaturePublicId : null,
        mimeType: type === "DRAWN" ? uploadedSignatureMimeType : null,
        signedAt,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        documentHash,
        signerEmail,
        otpVerified,
      },
    });

    try {
      await logAuditEvent({
        contractId: contract.id,
        signerId: signer.id,
        eventType: AuditEventType.CONTRACT_SIGNED,
        actorType: AuditActorType.SIGNER, // o PUBLIC_SIGNER si ese es tu enum real
        actorName: signer.name ?? null,
        actorEmail: signerEmail,
        ipAddress: req.ip || null,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : null,
        requestId:
          typeof req.headers["x-request-id"] === "string"
            ? req.headers["x-request-id"]
            : null,
        sessionId:
          typeof req.headers["x-session-id"] === "string"
            ? req.headers["x-session-id"]
            : null,
        metadata: {
          signatureId: createdSignature.id,
          signatureType: type,
          otpVerified,
          documentHash,
          signedAt: signedAt.toISOString(),
          signerOrder: signer.signerOrder,
          previousStatus,
        },
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - CONTRACT_SIGNED:", auditError);
    }

    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id },
      include: { signatures: true },
    });

    const allSigned = allSigners.every((s) => !s.partyRole || s.signatures.length > 0);

    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: allSigned ? "SIGNED" : "PARTIALLY_SIGNED" },
    });

    try {
      await logAuditEvent({
        contractId: contract.id,
        signerId: signer.id,
        eventType: allSigned
          ? AuditEventType.CONTRACT_SIGNED
          : AuditEventType.SIGNATURE_COMPLETED,
        actorType: AuditActorType.SIGNER,
        actorName: signer.name ?? null,
        actorEmail: signerEmail,
        ipAddress: req.ip || null,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : null,
        requestId:
          typeof req.headers["x-request-id"] === "string"
            ? req.headers["x-request-id"]
            : null,
        sessionId:
          typeof req.headers["x-session-id"] === "string"
            ? req.headers["x-session-id"]
            : null,
        metadata: {
          previousStatus,
          newStatus: updatedContract.status,
          allSigned,
          totalSigners: allSigners.length,
          signedSigners: allSigners.filter((s) => s.signatures.length > 0).length,
        },
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - CONTRACT_STATUS_CHANGE:", auditError);
    }

    if (allSigned) {
      try {
        const clienteNombre =
          contract.libranzaData?.clienteNombre ?? signer.name ?? "Cliente";
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const downloadLink = `${frontendUrl}/contracts/sign/${token}`;

        if (signerEmail) {
          await sendSignedContractEmail({
            to: signerEmail,
            clienteNombre,
            downloadLink,
            role: "cliente",
          });
        }

        const adminEmail = contract.parties.find((p) => p.role === "CONTRACTOR")?.email;
        if (adminEmail) {
          await sendSignedContractEmail({
            to: adminEmail,
            clienteNombre,
            downloadLink,
            role: "admin",
          });
        }
      } catch (emailErr: any) {
        console.error("EMAIL POST-FIRMA ERROR:", emailErr?.message);
      }
    }

    return res.json({
      ok: true,
      message: allSigned
        ? "Contrato firmado completamente"
        : "Firma registrada correctamente",
      status: updatedContract.status,
      documentHash,
    });
  } catch (error) {
    console.error("SIGN PUBLIC CONTRACT ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar la firma",
    });
  }
}

function getSignatureFolder(contractId: string) {
  return `contracts/${contractId}/signatures`;
}