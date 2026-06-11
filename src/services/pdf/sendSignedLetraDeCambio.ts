import { prisma } from "../../database/db";
import {
  sendCompanySignedLetraCambioEmail,
  sendSignedLetraCambioEmail,
} from "../../lib/email/sendLetraDeCambio";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generateLetraCambioPdf } from "./generateLetraDeCambio";

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

function buildSafeName(rawName: string | null | undefined, fallback: string) {
  return (rawName ?? fallback)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function sendSignedLetraCambioPdf(letraCambioId: string) {
  // 1. Cargar letra de cambio
  const letraCambio = await prisma.letraCambioData.findUnique({
    where: { id: letraCambioId },
    include: {
      contract: {
        include: { reciboConformidadData: true },
      },
    },
  });

  if (!letraCambio) {
    throw new Error(`Letra de cambio no encontrada (letraCambioId: ${letraCambioId})`);
  }

  // 2. Validar email antes de generar el PDF
  const clienteEmail = letraCambio.contract.reciboConformidadData?.clienteEmail ?? null;

  if (!clienteEmail) {
    throw new Error(`El cliente no tiene email registrado (letraCambioId: ${letraCambioId})`);
  }

  const clienteNombre = letraCambio.contract.reciboConformidadData?.clienteNombre ?? "Cliente";
  const clienteCC = letraCambio.contract.reciboConformidadData?.clienteCC ?? "";
  const safeName = buildSafeName(clienteNombre, "cliente");
  const fileName = `letra-de-cambio-${safeName}.pdf`;
  const templateKey = letraCambio.contract.templateKey as TemplateKey;

  // 3. Generar PDF con reintentos
  const pdfBuffer = await withRetry("Generar PDF letra cambio", () =>
    generateLetraCambioPdf({
      ...letraCambio,
      contract: {
        ...letraCambio.contract,
        reciboConformidadData: {
          clienteNombre,
          clienteCC,
          clienteEmail,
          ciudad: letraCambio.contract.reciboConformidadData?.ciudad ?? null,
        },
      },
    })
  );

  // 4. Enviar emails de forma independiente
  const [companyResult, clientResult] = await Promise.allSettled([
    withRetry("Email empresa letra cambio", () =>
      sendCompanySignedLetraCambioEmail({
        to: "analista@dimcultura.com",
        clienteNombre,
        pdfBuffer,
        fileName,
        templateKey,
      })
    ),
    withRetry("Email cliente letra cambio", () =>
      sendSignedLetraCambioEmail({
        to: clienteEmail,
        clienteNombre,
        pdfBuffer,
        fileName,
        templateKey,
      })
    ),
  ]);

  // 5. Loggear resultados parciales
  if (companyResult.status === "rejected") {
    console.error(
      `[sendSignedLetraCambioPdf] Email empresa falló (letraCambioId: ${letraCambioId}):`,
      companyResult.reason
    );
  }

  if (clientResult.status === "rejected") {
    console.error(
      `[sendSignedLetraCambioPdf] Email cliente falló (letraCambioId: ${letraCambioId}):`,
      clientResult.reason
    );
  }

  // Lanzar solo si ambos fallaron
  if (
    companyResult.status === "rejected" &&
    clientResult.status === "rejected"
  ) {
    throw new Error(
      `[sendSignedLetraCambioPdf] Ambos envíos fallaron (letraCambioId: ${letraCambioId})`
    );
  }
}