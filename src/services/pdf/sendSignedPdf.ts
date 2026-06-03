import { prisma } from "../../database/db";
import { sendCompanySignedContractEmail, sendSignedContractEmail } from "../../lib/email/sendSignedLibranza";
import { TemplateKey } from "../../lib/email/templateConfig";
import { buildCertDataFromContract, generateSignatureCertificatePdf } from "./generateSignatureCertificate";
import { generateContractPdf } from "./getEncryptedPDF";


export async function sendSignedContractPdf(contractId: string) {
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
  const contractedParty = contract.parties.find((p) => p.role === "DEUDOR");

  const identification = contract.libranzaData.clienteCC ?? "1007939670"
  const email = contractedParty?.email;
  const nombre = contractedParty?.name ?? "Cliente";

  if (!email) {
    throw new Error("El contratado no tiene email registrado");
  }

  // ── Generar PDFs en paralelo ─────────────────────────────────────────────

  const clientPdfBuffer = await generateContractPdf(
    contract,
    identification,
    "client"
  );

  const adminPdfBuffer = await generateContractPdf(
    contract,
    undefined,
    "admin"
  );

  const certBuffer = await generateSignatureCertificatePdf(
    buildCertDataFromContract(contract)
  );

  const safeName = (contract.libranzaData.clienteNombre ?? nombre)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  await sendCompanySignedContractEmail({
    to: 'analista@dimcultura.com',
    clienteNombre: nombre,
    pdfBuffer: adminPdfBuffer,
    fileName: `libranza-${safeName}.pdf`,
    certBuffer,
    certFileName: `certificado-firma-${safeName}.pdf`,
    templateKey: contract.templateKey as TemplateKey
  });

  await sendSignedContractEmail({
    to: email,
    clienteNombre: nombre,
    pdfBuffer: clientPdfBuffer,
    fileName: `libranza-${safeName}.pdf`,
    certBuffer,
    certFileName: `certificado-firma-${safeName}.pdf`,
    role: "cliente",
    templateKey: contract.templateKey as TemplateKey
  });
}

