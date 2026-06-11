import { prisma } from "../../database/db";
import {
  sendCompanySignedReciboConformidadEmail,
  sendSignedReciboConformidadEmail,
} from "../../lib/email/sendRecibo";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generateReciboConformidadPdf } from "./generateReciboPDF";
import type { ProductoItem } from "./reciboHtml";

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

function normalizeProductos(value: unknown): ProductoItem[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const producto = item as Record<string, unknown>;
    return {
      codigo: String(producto.codigo ?? ""),
      descripcion: String(producto.descripcion ?? ""),
      valor: String(producto.valor ?? "0"),
    };
  });
}

function buildSafeName(rawName: string | null | undefined, fallback: string) {
  return (rawName ?? fallback)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function sendSignedReciboPdf(reciboId: string) {
  // 1. Cargar recibo
  const reciboConformidad = await prisma.reciboConformidadData.findUnique({
    where: { id: reciboId },
    include: {
      contract: {
        include: {
          libranzaData: { select: { productos: true } },
        },
      },
    },
  });

  if (!reciboConformidad) {
    throw new Error(`Recibo no encontrado (reciboId: ${reciboId})`);
  }

  // 2. Validar email antes de generar el PDF
  if (!reciboConformidad.clienteEmail) {
    throw new Error(`El cliente no tiene email registrado (reciboId: ${reciboId})`);
  }

  const nombre = reciboConformidad.clienteNombre ?? "Cliente";
  const safeName = buildSafeName(reciboConformidad.clienteNombre, nombre);
  const fileName = `recibo-conformidad-${safeName}.pdf`;
  const templateKey = reciboConformidad.contract.templateKey as TemplateKey;
  const productos = normalizeProductos(
    reciboConformidad.contract.libranzaData?.productos
  );

  // 3. Generar PDF con reintentos
  const pdfBuffer = await withRetry("Generar PDF recibo", () =>
    generateReciboConformidadPdf({
      numeroRecibo: reciboConformidad.numeroRecibo,
      ciudad: reciboConformidad.ciudad,
      clienteNombre: nombre,
      clienteCC: reciboConformidad.clienteCC,
      clienteEmail: reciboConformidad.clienteEmail!,
      textoRecibido: reciboConformidad.textoRecibido,
      fechaFirma: reciboConformidad.fechaFirma,
      tipoFirma: reciboConformidad.tipoFirma,
      firmaImagenUrl: reciboConformidad.firmaImagenUrl,
      firmaTexto: reciboConformidad.firmaTexto,
      productos,
      contract: {
        templateKey: reciboConformidad.contract.templateKey,
        consecutivo: reciboConformidad.contract.consecutivo,
      },
    })
  );

  // 4. Enviar emails de forma independiente
  const [companyResult, clientResult] = await Promise.allSettled([
    withRetry("Email empresa recibo", () =>
      sendCompanySignedReciboConformidadEmail({
        to: "analista@dimcultura.com",
        clienteNombre: nombre,
        pdfBuffer,
        fileName,
        templateKey,
      })
    ),
    withRetry("Email cliente recibo", () =>
      sendSignedReciboConformidadEmail({
        to: reciboConformidad.clienteEmail!,
        clienteNombre: nombre,
        pdfBuffer,
        fileName,
        templateKey,
      })
    ),
  ]);

  // 5. Loggear resultados parciales
  if (companyResult.status === "rejected") {
    console.error(
      `[sendSignedReciboPdf] Email empresa falló (reciboId: ${reciboId}):`,
      companyResult.reason
    );
  }

  if (clientResult.status === "rejected") {
    console.error(
      `[sendSignedReciboPdf] Email cliente falló (reciboId: ${reciboId}):`,
      clientResult.reason
    );
  }

  // Lanzar solo si ambos fallaron
  if (
    companyResult.status === "rejected" &&
    clientResult.status === "rejected"
  ) {
    throw new Error(
      `[sendSignedReciboPdf] Ambos envíos fallaron (reciboId: ${reciboId})`
    );
  }
}