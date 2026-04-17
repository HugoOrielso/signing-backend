// src/services/pagare/sendSignedPagarePdf.ts
import { prisma } from "../../database/db";
import { sendSignedContractEmail, sendSignedPagareEmail } from "../../lib/email/sendContract";
import { generatePagarePdf } from "./generatePagare";

export async function sendSignedPagarePdf(pagareId: string) {
  const pagare = await prisma.pagare.findUnique({
    where: { id: pagareId },
    include: {
      signature: true,
    },
  });

  if (!pagare) {
    throw new Error("Pagaré no encontrado");
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
  });
}