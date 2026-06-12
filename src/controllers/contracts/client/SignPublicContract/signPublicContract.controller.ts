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

// ─── Helper: reintento con delay ─────────────────────────────────────────────

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[${label}] Intento ${attempt}/${retries} fallido:`, err);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw new Error(
    `[${label}] Falló después de ${retries} intentos. Último error: ${lastError}`
  );
}

// ─── Helper: crear pagaré con reintentos ─────────────────────────────────────

async function createPagareIfNeeded(contract: any): Promise<void> {
  if (!contract.libranzaData) return;

  await withRetry("Crear pagaré", async () => {
    const existing = await prisma.pagare.findUnique({
      where: { contractId: contract.id },
      select: { id: true },
    });

    if (existing) return; // Ya existe, no hacer nada

    const d = contract.libranzaData;

    await prisma.pagare.create({
      data: {
        contractId: contract.id,
        libranzaDataId: d.id,
        status: "DRAFT",
        libranzaToken: contract.token ?? "",
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
  });
}

// ─── Controller principal ─────────────────────────────────────────────────────

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
      return res.status(400).json({ ok: false, message: "Token requerido" });
    }

    if (!["TYPED", "DRAWN"].includes(type)) {
      return res.status(400).json({ ok: false, message: "Tipo inválido" });
    }

    // ── 1. Cargar contrato ──────────────────────────────────────────────────
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
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "El enlace expiró" });
    }

    const signer = contract.signers.find((s) => s.partyRole === "DEUDOR");

    if (!signer) {
      return res.status(400).json({ ok: false, message: "Firmante inválido" });
    }

    const alreadySigned =
      contract.signatures.some((sig) => sig.signerId === signer.id) ||
      contract.status === "SIGNED" ||
      contract.isSigned === true;

    if (alreadySigned) {
      return res.status(400).json({ ok: false, message: "Ya firmado" });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({ ok: false, message: "Firma requerida" });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({ ok: false, message: "Imagen inválida" });
    }

    // ── 2. Subir firma a Cloudinary (si es dibujada) ────────────────────────
    const auditContext = getAuditRequestContext(req);
    const previousStatus = contract.status;
    const signedAt = new Date();

    const documentHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          contractId: contract.id,
          signerId: signer.id,        
          signedAt: signedAt.toISOString(),
        })
      )
      .digest("hex");

    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const estimatedBytes = (imageUrl.length * 3) / 4;
      const maxBytes = 5 * 1024 * 1024; // 5MB

      if (estimatedBytes > maxBytes) {
        return res.status(400).json({
          ok: false,
          message: "La imagen de firma es demasiado grande (máx 5MB)",
        });
      }

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: `contracts/${contract.id}/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    // ── 3. Guardar firma (operación crítica, sin mezclar nada más) ──────────
    const context = getRequestContext(req);

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

    // ── 4. Audit: firma ─────────────────────────────────────────────────────
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

    // ── 5. Verificar si todos firmaron ──────────────────────────────────────
    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id },
      include: { signatures: true },
    });

    const allSigned = allSigners
      .filter((s) => s.partyRole === "DEUDOR")
      .every((s) => s.signatures.length > 0);

    // ── 6. Actualizar estado del contrato (solo esto, sin el pagaré) ────────
    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "READY_TO_SIGN",
        isSigned: true,
      },
    });

    // ── 7. Audit: cambio de estado ──────────────────────────────────────────
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

    // ── 8. Responder al cliente YA (no bloquear por pagaré ni email) ────────
    res.json({
      ok: true,
      status: updatedContract.status,
      documentHash,
      imageUrl: uploadedSignatureUrl,
      pagareCreated: allSigned,
    });

    if (allSigned) {
      createPagareIfNeeded(contract).catch((e) =>
        console.error(`[Pagaré] Error tras reintentos (contractId: ${contract.id}):`, e)
      );

      sendSignedContractPdf(contract.id).catch((e) =>
        console.error(`[Email] Error tras reintentos (contractId: ${contract.id}):`, e)
      );
    }

  } catch (error) {
    console.error("SIGN ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar la libranza",
    });
  }
}

// ─── Endpoint de prueba ───────────────────────────────────────────────────────

export async function signLibranzaPrueba(req: Request, res: Response) {
  try {
    await sendSignedContractPdf("7c226516-91b6-4d6f-92f6-9e2062bf3cf7");
  } catch (e) {
    console.error("EMAIL ERROR:", e);
  }

  return res.json({ ok: true });
}