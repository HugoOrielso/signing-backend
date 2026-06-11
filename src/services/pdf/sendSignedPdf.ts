import { prisma } from "../../database/db";
import {
  sendCompanySignedContractEmail,
  sendSignedContractEmail,
} from "../../lib/email/sendSignedLibranza";
import { TemplateKey } from "../../lib/email/templateConfig";
import {
  buildCertDataFromContract,
  generateSignatureCertificatePdf,
} from "./generateSignatureCertificate";
import { generateContractPdf } from "./getEncryptedPDF";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1500
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

  const identification = contract.libranzaData.clienteCC ?? "1007939670";
  const safeName = buildSafeName(contract.libranzaData.clienteNombre, nombre);

  // 3. Generar los tres PDFs en paralelo con reintentos individuales
  const [clientPdfBuffer, adminPdfBuffer, certBuffer] =
    await Promise.all([
      withRetry("PDF cliente", () =>
        generateContractPdf(contract, identification, "client")
      ),
      withRetry("PDF admin", () =>
        generateContractPdf(contract, undefined, "admin")
      ),
      withRetry("Certificado firma", () =>
        generateSignatureCertificatePdf(buildCertDataFromContract(contract))
      ),
    ]);

  const templateKey = contract.templateKey as TemplateKey;
  const fileName = `libranza-${safeName}.pdf`;
  const certFileName = `certificado-firma-${safeName}.pdf`;

  // 4. Enviar ambos emails de forma independiente:
  //    si uno falla, el otro sigue adelante
  const [companyResult, clientResult] = await Promise.allSettled([
    withRetry("Email empresa", () =>
      sendCompanySignedContractEmail({
        to: "analista@dimcultura.com",
        clienteNombre: nombre,
        pdfBuffer: adminPdfBuffer,
        fileName,
        certBuffer,
        certFileName,
        templateKey,
      })
    ),
    withRetry("Email cliente", () =>
      sendSignedContractEmail({
        to: email,
        clienteNombre: nombre,
        pdfBuffer: clientPdfBuffer,
        fileName,
        certBuffer,
        certFileName,
        role: "cliente",
        templateKey,
      })
    ),
  ]);

  // 5. Loggear resultados parciales sin lanzar excepción si uno falló
  if (companyResult.status === "rejected") {
    console.error(
      `[sendSignedContractPdf] Email empresa falló (contractId: ${contractId}):`,
      companyResult.reason
    );
  }

  if (clientResult.status === "rejected") {
    console.error(
      `[sendSignedContractPdf] Email cliente falló (contractId: ${contractId}):`,
      clientResult.reason
    );
  }

  // Lanzar solo si ambos fallaron
  if (
    companyResult.status === "rejected" &&
    clientResult.status === "rejected"
  ) {
    throw new Error(
      `[sendSignedContractPdf] Ambos envíos fallaron para contractId: ${contractId}`
    );
  }
}