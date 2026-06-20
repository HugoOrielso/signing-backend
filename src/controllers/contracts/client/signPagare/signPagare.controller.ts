import { prisma } from "../../../../database/db";
import type { Request, Response } from "express";
import crypto from "crypto";
import cloudinary from "../../../../config/cloudinary";
import { sendSignedPagarePdf } from "../../../../services/pdf/sendSignedPagare.controller";
import { getPublicAuditContext, safeAudit } from "../../../../helpers/udit";
import { trackPagareSigned } from "../../../../services/audit/contract-audit.service";

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

// ─── Helper: crear recibo de conformidad con reintentos ──────────────────────

async function createReciboConformidad(
  contractId: string,
  pagare: any
): Promise<void> {
  await withRetry("Recibo conformidad", () =>
    prisma.reciboConformidadData.upsert({
      where: { contractId },
      create: {
        contractId,
        ciudad: pagare.ciudadFirma ?? pagare.ciudadPago ?? null,
        clienteNombre: pagare.deudorNombre ?? "Cliente",
        clienteCC: pagare.deudorDocumento ?? null,
        clienteEmail: pagare.deudorEmail,
        textoRecibido:
          "los productos y/o servicios relacionados en el pagaré y contrato asociado.",
      },
      update: {
        ciudad: pagare.ciudadFirma ?? pagare.ciudadPago ?? null,
        clienteNombre: pagare.deudorNombre ?? "Cliente",
        clienteCC: pagare.deudorDocumento ?? null,
        textoRecibido:
          "los productos y/o servicios relacionados en el pagaré y contrato asociado.",
      },
    })
  );
}

// ─── Helper: actualizar contrato con reintentos ──────────────────────────────

async function updateContractAfterPagare(contractId: string): Promise<void> {
  await withRetry("Update contrato post-pagaré", () =>
    prisma.contract.update({
      where: { id: contractId },
      data: {
        isSigned: true,
        pagareSigned: true,
        isConformityReceiptSigned: false,
      },
    })
  );
}

// ─── Controller principal ─────────────────────────────────────────────────────

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

    // ── Validaciones tempranas ──────────────────────────────────────────────
    if (!token) {
      return res.status(400).json({ ok: false, message: "Token requerido" });
    }

    if (!["TYPED", "DRAWN"].includes(type)) {
      return res.status(400).json({ ok: false, message: "Tipo de firma inválido" });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({ ok: false, message: "Valor de firma requerido" });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({ ok: false, message: "Imagen de firma inválida" });
    }

    // ── 1. Cargar contrato ──────────────────────────────────────────────────
    const contract = await prisma.contract.findFirst({
      where: { token },
      select: {
        id: true,
        title: true,
        signers: {
          select: { id: true, name: true, email: true },
          take: 1,
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    // ── 2. Cargar pagaré ────────────────────────────────────────────────────
    const pagare = await prisma.pagare.findUnique({
      where: { contractId: contract.id },
      include: { signature: true },
    });

    if (!pagare) {
      return res.status(404).json({ ok: false, message: "Pagaré no encontrado" });
    }

    if (pagare.isSigned || pagare.signature) {
      return res.status(400).json({ ok: false, message: "El pagaré ya fue firmado" });
    }

    // ── 3. Preparar hash ────────────────────────────────────────────────────
    const signedAt = new Date();

    const documentHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
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
        })
      )
      .digest("hex");

    // ── 4. Subir firma a Cloudinary (si es dibujada) ────────────────────────
    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const estimatedBytes = (imageUrl.length * 3) / 4;
      const maxBytes = 5 * 1024 * 1024;

      if (estimatedBytes > maxBytes) {
        return res.status(400).json({
          ok: false,
          message: "La imagen de firma es demasiado grande (máx 5MB)",
        });
      }

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: `pagares/${pagare.id}/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    // ── 5. Guardar firma + update pagaré (operación crítica y atómica) ──────
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

      return { signature, updatedPagare };
    });

    // ── 6. Audit ────────────────────────────────────────────────────────────
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

    // ── 7. Responder al cliente YA ──────────────────────────────────────────
    res.json({
      ok: true,
      message: "Pagaré firmado correctamente",
      pagareId: pagare.id,
      pagareNumber: result.updatedPagare.number,
      signedAt: result.updatedPagare.signedAt,
      status: result.updatedPagare.status,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });

    // ── 8. Operaciones derivadas en background ──────────────────────────────
    createReciboConformidad(contract.id, pagare).catch((e) =>
      console.error(
        `[ReciboConformidad] Error tras reintentos (contractId: ${contract.id}):`,
        e
      )
    );

    updateContractAfterPagare(contract.id).catch((e) =>
      console.error(
        `[UpdateContrato] Error tras reintentos (contractId: ${contract.id}):`,
        e
      )
    );

    sendSignedPagarePdf(pagare.id).catch((e) =>
      console.error(
        `[Email pagaré] Error tras reintentos (pagareId: ${pagare.id}):`,
        e
      )
    );

  } catch (error) {
    console.error("SIGN PAGARE ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar el pagaré",
    });
  }
}


export async function testPagare(req: Request, res: Response) {
  sendSignedPagarePdf("6f7e277d-e7b5-4830-810d-0dc79d3ab66c").catch((e) =>
    console.error(
      `[Email pagaré] Error tras reintentos (pagareId: 6f7e277d-e7b5-4830-810d-0dc79d3ab66c):`,
      e
    )
  );
  return res.status(200)
}