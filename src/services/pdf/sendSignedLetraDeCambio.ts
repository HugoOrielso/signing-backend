import { prisma } from "../../database/db";
import { sendCompanySignedLetraCambioEmail, sendSignedLetraCambioEmail } from "../../lib/email/sendLetraDeCambio";

import { getTemplateConfig, TemplateKey } from "../../lib/email/templateConfig";
import { generateLetraCambioPdf } from "./generateLetraDeCambio";

export async function sendSignedLetraCambioPdf(letraCambioId: string) {
  const letraCambio = await prisma.letraCambioData.findUnique({
    where: { id: letraCambioId },
    include: {
      contract: {
        include: {
          reciboConformidadData: true,
        },
      },
    },
  });

  if (!letraCambio) {
    throw new Error("Letra de cambio no encontrada");
  }

  const clienteEmail =
    letraCambio.contract.reciboConformidadData?.clienteEmail ?? null;

  const clienteNombre =
    letraCambio.contract.reciboConformidadData?.clienteNombre ?? "Cliente";

  const clienteCC =
    letraCambio.contract.reciboConformidadData?.clienteCC ?? "";

  if (!clienteEmail) {
    throw new Error("El cliente no tiene email registrado");
  }

  const pdfBuffer = await generateLetraCambioPdf({
    ...letraCambio,
    contract: {
      ...letraCambio.contract,
      reciboConformidadData: {
        clienteNombre,
        clienteCC,
        clienteEmail,
        ciudad:
          letraCambio.contract.reciboConformidadData?.ciudad ?? null,
      },
    },
  });

  const safeName = clienteNombre
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const fileName = `letra-de-cambio-${safeName}.pdf`;

  await sendCompanySignedLetraCambioEmail({
    to: "analista@dimcultura.com",
    clienteNombre,
    pdfBuffer,
    fileName,
    templateKey: letraCambio.contract.templateKey as TemplateKey,
  });

  await sendSignedLetraCambioEmail({
    to: clienteEmail,
    clienteNombre,
    pdfBuffer,
    fileName,
    templateKey: letraCambio.contract.templateKey as TemplateKey,
  });
}