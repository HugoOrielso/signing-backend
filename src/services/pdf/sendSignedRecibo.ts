// src/services/recibo/sendSignedReciboPdf.ts

import { prisma } from "../../database/db";
import {
  sendCompanySignedReciboConformidadEmail,
  sendSignedReciboConformidadEmail,
} from "../../lib/email/sendRecibo";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generateReciboConformidadPdf } from "./generateReciboPDF";

export async function sendSignedReciboPdf(reciboId: string) {
  const reciboConformidad = await prisma.reciboConformidadData.findUnique({
    where: { id: reciboId },
    include: {
      contract: true,
    },
  });

  if (!reciboConformidad) {
    throw new Error("Recibo no encontrado");
  }

  if (!reciboConformidad.clienteEmail) {
    throw new Error("El cliente no tiene email registrado");
  }

  const pdfBuffer = await generateReciboConformidadPdf(reciboConformidad);

  const safeName = (reciboConformidad.clienteNombre ?? "cliente")
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const fileName = `recibo-conformidad-${safeName}.pdf`;

  await sendCompanySignedReciboConformidadEmail({
    to: "libranzasfirmadas@gmail.com",
    clienteNombre: reciboConformidad.clienteNombre ?? "Cliente",
    pdfBuffer,
    fileName,
    templateKey: reciboConformidad.contract.templateKey as TemplateKey,
  });

  await sendSignedReciboConformidadEmail({
    to: reciboConformidad.clienteEmail,
    clienteNombre: reciboConformidad.clienteNombre ?? "Cliente",
    pdfBuffer,
    fileName,
    templateKey: reciboConformidad.contract.templateKey as TemplateKey,
  });
}