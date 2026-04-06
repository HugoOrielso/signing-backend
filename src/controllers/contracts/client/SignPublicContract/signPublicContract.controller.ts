import { prisma } from "../../../../database/db";
import { sendSignedContractEmail } from "../../../../lib/email/sendContract";
import type { Request, Response } from "express";
import crypto from "crypto";
import cloudinary from "../../../../config/cloudinary";
import {
  trackContractSigned,
  trackContractStatusChange,
} from "../../../../services/audit/contract-audit.service";
import { getAuditRequestContext } from "../../../../utils/audit-request";
import { sendSignedContractPdf } from "../../../../services/pdf/sendSignedPdf";

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

    const signer = contract.signers.find(
      (s) => s.partyRole === "DEUDOR"
    );

    if (!signer) {
      return res.status(400).json({
        ok: false,
        message: "Firmante inválido",
      });
    }

    const alreadySigned = contract.signatures.some(
      (sig) => sig.signerId === signer.id
    );

    if (alreadySigned) {
      return res.status(400).json({
        ok: false,
        message: "Ya firmado",
      });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({ ok: false, message: "Firma requerida" });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({ ok: false, message: "Imagen inválida" });
    }

    const auditContext = getAuditRequestContext(req);
    const previousStatus = contract.status;
    const signedAt = new Date();

    const documentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        contractId: contract.id,
        signedAt: signedAt.toISOString(),
      }))
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

    const createdSignature = await prisma.signature.create({
      data: {
        contractId: contract.id,
        signerId: signer.id,
        type,
        typedValue: type === "TYPED" ? typedValue!.trim() : null,
        imageUrl: uploadedSignatureUrl,
        signaturePublicId: uploadedSignaturePublicId,
        signedAt,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        documentHash,
      },
    });

    // 🔥 AUDITORÍA FIRMA
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

    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: allSigned ? "SIGNED" : "PARTIALLY_SIGNED" },
    });

    // 🔥 AUDITORÍA ESTADO
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

    // EMAIL
    // EMAIL
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
    });
  } catch (error) {
    console.error("SIGN ERROR", error);
    return res.status(500).json({ ok: false });
  }
}