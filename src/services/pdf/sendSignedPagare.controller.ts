// src/services/pagare/sendSignedPagarePdf.ts
import { prisma } from "../../database/db";
import { sendSignedPagareEmail } from "../../lib/email/sendSignedPagare";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generatePagarePdf } from "./generatePagare";

export async function sendSignedPagarePdf(pagareId: string) {
  const pagare = await prisma.pagare.findUnique({
    where: { id: pagareId },
    include: {
      signature: true,
      contract: true, // 👈 aquí está la clave
    },
  });

  if (!pagare) {
    throw new Error("Pagaré no encontrado");
  }

  if (!pagare.contract) {
    throw new Error("El pagaré no tiene contrato asociado");
  }

  if (!pagare.deudorEmail) {
    throw new Error("El deudor no tiene email registrado");
  }

  const pdfBuffer = await generatePagarePdf(pagare);

  const safeName = (pagare.deudorNombre ?? "cliente")
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  await sendSignedPagareEmail({
    to: pagare.deudorEmail,
    clienteNombre: pagare.deudorNombre ?? "Cliente",
    pdfBuffer,
    fileName: `pagare-${safeName}.pdf`,
    role: "cliente",
    templateKey: pagare.contract.templateKey as TemplateKey, 
  });
}