import { prisma } from "../../database/db";
import { sendSignedContractEmail } from "../../lib/email/sendContract";
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
  const identification = contractedParty?.identification ?? "dimcultura";
  const email = contractedParty?.email;
  const nombre = contractedParty?.name ?? "Cliente";

  if (!email) {
    throw new Error("El contratado no tiene email registrado");
  }

  // ── Generar PDFs en paralelo ─────────────────────────────────────────────
  const [pdfBuffer, certBuffer] = await Promise.all([
    generateContractPdf(contract, identification),
    generateSignatureCertificatePdf(buildCertDataFromContract(contract)),
  ]);

  const safeName = (contract.libranzaData.clienteNombre ?? nombre)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  await sendSignedContractEmail({
    to: email,
    clienteNombre: nombre,
    pdfBuffer,
    fileName: `libranza-${safeName}.pdf`,
    certBuffer,                              // ← adjunto extra
    certFileName: `certificado-firma-${safeName}.pdf`,
    role: "cliente",
  });
}