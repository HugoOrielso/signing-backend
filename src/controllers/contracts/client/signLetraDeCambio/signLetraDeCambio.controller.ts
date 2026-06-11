import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";
import cloudinary from "../../../../config/cloudinary";
import crypto from "node:crypto";
import { sendSignedLetraCambioPdf } from "../../../../services/pdf/sendSignedLetraDeCambio";

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

// ─── Helper: actualizar contrato con reintentos ──────────────────────────────

async function updateContractAfterLetraCambio(contractId: string): Promise<void> {
  await withRetry("Update contrato post-letra", () =>
    prisma.contract.update({
      where: { id: contractId },
      data: {
        isLetraCambioSigned: true,
        status: "SIGNED",
      },
    })
  );
}

// ─── Controller principal ─────────────────────────────────────────────────────

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

    if (type === "DRAWN" && !sigData?.startsWith("data:image/")) {
      return res.status(400).json({ ok: false, message: "Imagen de firma inválida" });
    }

    // ── 1. Cargar contrato ──────────────────────────────────────────────────
    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        letraCambioData: true,
        reciboConformidadData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    if (!contract.isSigned) {
      return res.status(400).json({ ok: false, message: "Primero debe firmarse la libranza" });
    }

    if (!contract.pagareSigned) {
      return res.status(400).json({ ok: false, message: "Primero debe firmarse el pagaré" });
    }

    if (!contract.isConformityReceiptSigned) {
      return res.status(400).json({ ok: false, message: "Primero debe firmarse el recibo de conformidad" });
    }

    if (contract.isLetraCambioSigned) {
      return res.status(400).json({ ok: false, message: "La letra de cambio ya fue firmada" });
    }

    // ── 2. Preparar datos ───────────────────────────────────────────────────
    const signedAt = new Date();

    const signedIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const signedUserAgent = req.headers["user-agent"] ?? null;

    const documentHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          consecutivo: contract.consecutivo,
          letraCambioId: contract.letraCambioData?.id ?? null,
          signedAt: signedAt.toISOString(),
          type,
          typedValue: type === "TYPED" ? typedValue?.trim() ?? null : null,
          signedIp,
          signedUserAgent,
        })
      )
      .digest("hex");

    // ── 3. Subir firma a Cloudinary (si es dibujada) ────────────────────────
    let uploadedSignatureUrl: string | null = null;

    if (type === "DRAWN" && sigData) {
      const estimatedBytes = (sigData.length * 3) / 4;
      const maxBytes = 5 * 1024 * 1024;

      if (estimatedBytes > maxBytes) {
        return res.status(400).json({
          ok: false,
          message: "La imagen de firma es demasiado grande (máx 5MB)",
        });
      }

      const uploadResult = await cloudinary.uploader.upload(sigData, {
        folder: `contracts/${contract.id}/letra-cambio/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
    }

    // ── 4. Guardar firma de la letra (operación crítica, va sola) ───────────
    const letraCambio = await prisma.letraCambioData.upsert({
      where: { contractId: contract.id },
      create: {
        contract: { connect: { id: contract.id } },
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

    // ── 5. Responder al cliente YA ──────────────────────────────────────────
    res.json({
      ok: true,
      message: "Letra de cambio firmada correctamente",
      contractId: contract.id,
      signedAt,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });

    // ── 6. Operaciones derivadas en background ──────────────────────────────
    updateContractAfterLetraCambio(contract.id).catch((e) =>
      console.error(
        `[UpdateContrato] Error tras reintentos (contractId: ${contract.id}):`,
        e
      )
    );

    sendSignedLetraCambioPdf(letraCambio.id).catch((e) =>
      console.error(
        `[Email letra cambio] Error tras reintentos (letraCambioId: ${letraCambio.id}):`,
        e
      )
    );

  } catch (error) {
    console.error("SIGN LETRA CAMBIO ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar la letra de cambio",
    });
  }
}

// ─── Endpoint de prueba ───────────────────────────────────────────────────────

export async function exampleLetraCambio(req: Request, res: Response) {
  try {
    await sendSignedLetraCambioPdf("cmpw4y4ni0000vsvq6dmvd69v");
    return res.status(200).json({ ok: true, message: "Letra de cambio enviada correctamente" });
  } catch (pdfError) {
    console.error("SEND SIGNED LETRA CAMBIO PDF ERROR", pdfError);
    return res.status(500).json({ ok: false, message: "No se pudo enviar el PDF" });
  }
}