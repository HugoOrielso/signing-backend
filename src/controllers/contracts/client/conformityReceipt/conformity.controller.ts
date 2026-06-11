import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";
import cloudinary from "../../../../config/cloudinary";
import crypto from "node:crypto";
import { sendSignedReciboPdf } from "../../../../services/pdf/sendSignedRecibo";

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

// ─── Helper: crear letraCambio con reintentos ────────────────────────────────

async function createLetraCambio(contractId: string): Promise<void> {
  await withRetry("Letra de cambio", () =>
    prisma.letraCambioData.upsert({
      where: { contractId },
      create: {
        contract: { connect: { id: contractId } },
      },
      update: {},
    })
  );
}

// ─── Helper: actualizar contrato con reintentos ──────────────────────────────

async function updateContractAfterRecibo(contractId: string): Promise<void> {
  await withRetry("Update contrato post-recibo", () =>
    prisma.contract.update({
      where: { id: contractId },
      data: {
        isConformityReceiptSigned: true,
        isLetraCambioSigned: false,
      },
    })
  );
}

// ─── Controller principal ─────────────────────────────────────────────────────

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
        reciboConformidadData: true,
        libranzaData: { select: { productos: true } },
        signers: {
          select: { id: true, name: true, email: true },
          take: 1,
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
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

    // ── 2. Preparar hash ────────────────────────────────────────────────────
    const signedAt = new Date();

    const documentHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          consecutivo: contract.consecutivo,
          reciboConformidadId: contract.reciboConformidadData?.id ?? null,
          clienteNombre: contract.reciboConformidadData?.clienteNombre ?? null,
          clienteCC: contract.reciboConformidadData?.clienteCC ?? null,
          signedAt: signedAt.toISOString(),
          type,
          typedValue: type === "TYPED" ? typedValue?.trim() ?? null : null,
        })
      )
      .digest("hex");

    // ── 3. Subir firma a Cloudinary (si es dibujada) ────────────────────────
    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;

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
        folder: `contracts/${contract.id}/conformity-receipt/signatures`,
        resource_type: "image",
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
    }

    // ── 4. Guardar firma del recibo (operación crítica, va sola) ────────────
    const reciboConformidad = await prisma.reciboConformidadData.upsert({
      where: { contractId: contract.id },
      create: {
        contract: { connect: { id: contract.id } },
        clienteNombre: contract.reciboConformidadData?.clienteNombre ?? "Cliente",
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

    // ── 5. Responder al cliente YA ──────────────────────────────────────────
    res.json({
      ok: true,
      message: "Recibo de conformidad firmado correctamente",
      contractId: contract.id,
      signedAt,
      documentHash,
      imageUrl: uploadedSignatureUrl,
    });

    // ── 6. Operaciones derivadas en background ──────────────────────────────
    createLetraCambio(contract.id).catch((e) =>
      console.error(
        `[LetraCambio] Error tras reintentos (contractId: ${contract.id}):`,
        e
      )
    );

    updateContractAfterRecibo(contract.id).catch((e) =>
      console.error(
        `[UpdateContrato] Error tras reintentos (contractId: ${contract.id}):`,
        e
      )
    );

    sendSignedReciboPdf(reciboConformidad.id).catch((e) =>
      console.error(
        `[Email recibo] Error tras reintentos (reciboId: ${reciboConformidad.id}):`,
        e
      )
    );

  } catch (error) {
    console.error("SIGN CONFORMITY RECEIPT ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo firmar el recibo de conformidad",
    });
  }
}

// ─── Endpoints auxiliares ─────────────────────────────────────────────────────

export async function testRecibo(req: Request, res: Response) {
  try {
    await sendSignedReciboPdf("cmot3d7tt000180vqzay95dp2");
  } catch (pdfError) {
    console.error("SEND SIGNED CONFORMITY RECEIPT PDF ERROR", pdfError);
  }

  return res.status(200).json({ ok: true });
}

export async function getConformityReceipt(req: Request, res: Response) {
  try {
    const { token } = req.params as { token: string };

    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        reciboConformidadData: true,
        libranzaData: { select: { productos: true } },
      },
    });

    if (!contract || !contract.reciboConformidadData) {
      return res.status(404).json({ ok: false, message: "Recibo no encontrado" });
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
    console.error("GET CONFORMITY RECEIPT ERROR", error);
    return res.status(500).json({ ok: false, message: "Error al obtener el recibo" });
  }
}