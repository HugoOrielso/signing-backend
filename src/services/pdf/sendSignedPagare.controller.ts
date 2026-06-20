import { prisma } from "../../database/db";
import {
  sendCompanySignedPagareEmail,
  sendPagareNotificationEmail,
} from "../../lib/email/sendSignedPagare";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generatePagarePdf } from "./generatePagare";

// ─── Helper: reintento con delay ─────────────────────────────────────────────

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 3500
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

export async function sendSignedPagarePdf(pagareId: string) {
  // 1. Cargar pagaré
  const pagare = await prisma.pagare.findUnique({
    where: { id: pagareId },
    include: {
      signature: true,
      contract: true,
    },
  });

  if (!pagare) {
    throw new Error(`Pagaré no encontrado (pagareId: ${pagareId})`);
  }

  if (!pagare.contract) {
    throw new Error(`El pagaré no tiene contrato asociado (pagareId: ${pagareId})`);
  }

  // 2. Validar email antes de generar el PDF
  if (!pagare.deudorEmail) {
    throw new Error(`El deudor no tiene email registrado (pagareId: ${pagareId})`);
  }

  const nombre = pagare.deudorNombre ?? "Cliente";
  const safeName = buildSafeName(pagare.deudorNombre, nombre);
  const fileName = `pagare-${safeName}.pdf`;
  const templateKey = pagare.contract.templateKey as TemplateKey;

  // 3. Generar PDF (solo se usa para la empresa) con reintentos
  const pdfBuffer = await withRetry("Generar PDF pagaré", () =>
    generatePagarePdf(pagare)
  );

  // 4. Enviar emails de forma independiente
  const [companyResult, clientResult] = await Promise.allSettled([
    withRetry("Email empresa pagaré", () =>
      sendCompanySignedPagareEmail({
        to: "analista@dimcultura.com",
        clienteNombre: nombre,
        pdfBuffer,
        fileName,
        templateKey,
      })
    ),
    withRetry("Email cliente pagaré", () =>
      sendPagareNotificationEmail({
        to: pagare.deudorEmail!,
        clienteNombre: nombre,
        templateKey,
      })
    ),
  ]);

  // 5. Loggear resultados parciales
  if (companyResult.status === "rejected") {
    console.error(
      `[sendSignedPagarePdf] Email empresa falló (pagareId: ${pagareId}):`,
      companyResult.reason
    );
  }

  if (clientResult.status === "rejected") {
    console.error(
      `[sendSignedPagarePdf] Email cliente falló (pagareId: ${pagareId}):`,
      clientResult.reason
    );
  }

  // Lanzar solo si ambos fallaron
  if (
    companyResult.status === "rejected" &&
    clientResult.status === "rejected"
  ) {
    throw new Error(
      `[sendSignedPagarePdf] Ambos envíos fallaron (pagareId: ${pagareId})`
    );
  }

}