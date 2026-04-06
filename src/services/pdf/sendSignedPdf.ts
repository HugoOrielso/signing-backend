import { prisma } from "../../database/db";
import { sendSignedContractEmail } from "../../lib/email/sendContract";
import { generateContractPdf } from "./getEncryptedPDF";

export async function sendSignedContractPdf(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      parties: true,
      signers: { orderBy: { signerOrder: "asc" } },
      signatures: true,
      libranzaData: { include: { references: { orderBy: { createdAt: "asc" } } } },
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

  const pdfBuffer = await generateContractPdf(contract, identification);

  const safeName = (contract.libranzaData.clienteNombre ?? nombre)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const fileName = `libranza-${safeName}.pdf`;

  await sendSignedContractEmail({
    to: email,
    clienteNombre: nombre,
    pdfBuffer,
    fileName,
    role: "cliente"
  });
}