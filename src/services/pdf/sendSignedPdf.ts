import { prisma } from "../../database/db";
import {
  sendCompanyCertificateEmail,
  sendCompanySignedContractEmail,
  sendSignatureNotificationEmail,
} from "../../lib/email/sendSignedLibranza";
import { resolveTemplateKey } from "../../lib/email/templateConfig";
import { normalizePdf } from "../../utils/normalizePdf";
import {
  buildCertDataFromContract,
  generateSignatureCertificatePdf,
} from "./generateSignatureCertificate";
import { generateContractPdf } from "./getEncryptedPDF";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Main ────────────────────────────────────────────────────────────────────

export async function sendSignedContractPdf(contractId: string) {
  // 1. Cargar contrato
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      parties: true,
      signers: {
        orderBy: { signerOrder: "asc" },
        include: { signatures: true },
      },
      signatures: true,
      libranzaData: {
        include: { references: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!contract?.libranzaData) {
    throw new Error("Contrato no encontrado o sin datos de libranza");
  }

  // 2. Validar destinatario antes de generar PDFs
  const contractedParty = contract.parties.find((p) => p.role === "DEUDOR");
  const email = contractedParty?.email;
  const nombre = contractedParty?.name ?? "Cliente";

  if (!email) {
    throw new Error(
      `El contratado no tiene email registrado (contractId: ${contractId})`
    );
  }

  const safeName = buildSafeName(contract.libranzaData.clienteNombre, nombre);

  // 3. Generar PDFs para la empresa (admin + certificado) en paralelo con reintentos
  const [adminPdfBuffer, rawCertBuffer] = await Promise.all([
    withRetry("PDF admin", () =>
      generateContractPdf(contract, undefined, "admin")
    ),
    withRetry("Certificado firma", () =>
      generateSignatureCertificatePdf(
        buildCertDataFromContract(contract)
      )
    ),
  ]);

  const certBuffer = await normalizePdf(rawCertBuffer);

  const templateKey = resolveTemplateKey(contract.templateKey);
  const fileName = `libranza-${safeName}.pdf`;
  const certFileName = `certificado-firma-${safeName}.pdf`;

  // 4. Enviar ambos emails de forma independiente:
  //    si uno falla, el otro sigue adelante
  const [
    companyContractResult,
    companyCertificateResult,
    clientResult,
  ] = await Promise.allSettled([
    withRetry("Email empresa - libranza", () =>
      sendCompanySignedContractEmail({
        to: "analista@dimcultura.com",
        clienteNombre: nombre,
        pdfBuffer: adminPdfBuffer,
        fileName,
        templateKey,
      })
    ),

    withRetry("Email empresa - certificado", () =>
      sendCompanyCertificateEmail({
        to: "analista@dimcultura.com",
        clienteNombre: nombre,
        certBuffer,
        certFileName,
        templateKey,
      })
    ),

    withRetry("Email cliente", () =>
      sendSignatureNotificationEmail({
        to: email,
        clienteNombre: nombre,
        templateKey,
        consecutivo: contract.consecutivo,
      })
    ),
  ]);


  if (companyContractResult.status === "rejected") {
    console.error(
      `[sendSignedContractPdf] Email empresa falló (contractId: ${contractId}):`,
      companyContractResult.reason
    );
  }
  
  if (companyCertificateResult.status === "rejected") {
    console.error(
      `[sendSignedContractPdf] Email empresa falló (contractId: ${contractId}):`,
      companyCertificateResult.reason
    );
  }

  if (clientResult.status === "rejected") {
    console.error(
      `[sendSignedContractPdf] Email cliente falló (contractId: ${contractId}). ` +
      `El cliente firmó correctamente pero no recibió la notificación por correo:`,
      clientResult.reason
    );
  }

  // Lanzar solo si ambos fallaron
  if (
    companyContractResult.status === "rejected" &&
    companyCertificateResult.status === "rejected" &&
    clientResult.status === "rejected"
  ) {
    throw new Error(
      `[sendSignedContractPdf] Ambos envíos fallaron para contractId: ${contractId}`
    );
  }
}