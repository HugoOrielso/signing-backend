// src/services/recibo/sendSignedReciboPdf.ts

import { prisma } from "../../database/db";
import {
  sendCompanySignedReciboConformidadEmail,
  sendSignedReciboConformidadEmail,
} from "../../lib/email/sendRecibo";
import { TemplateKey } from "../../lib/email/templateConfig";
import { generateReciboConformidadPdf } from "./generateReciboPDF";
import type { ProductoItem } from "./reciboHtml";

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

export async function sendSignedReciboPdf(reciboId: string) {
  const reciboConformidad = await prisma.reciboConformidadData.findUnique({
    where: { id: reciboId },
    include: {
      contract: {
        include: {
          libranzaData: {
            select: {
              productos: true,
            },
          },
        },
      },
    },
  });

  if (!reciboConformidad) {
    throw new Error("Recibo no encontrado");
  }

  if (!reciboConformidad.clienteEmail) {
    throw new Error("El cliente no tiene email registrado");
  }

  const productos = normalizeProductos(
    reciboConformidad.contract.libranzaData?.productos
  );

  const pdfBuffer = await generateReciboConformidadPdf({
    numeroRecibo: reciboConformidad.numeroRecibo,
    ciudad: reciboConformidad.ciudad,
    clienteNombre: reciboConformidad.clienteNombre,
    clienteCC: reciboConformidad.clienteCC,
    clienteEmail: reciboConformidad.clienteEmail,
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
  });

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