import { prisma } from "../../database/db";
import { sendSignedContractEmail } from "../../lib/email/sendSignedLibranza";
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
  const pdfBuffer = await generateContractPdf(contract, identification);
  const certBuffer = await generateSignatureCertificatePdf(
    buildCertDataFromContract(contract)
  );

  const safeName = (contract.libranzaData.clienteNombre ?? nombre)
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  await sendSignedContractEmail({
    to: email,
    clienteNombre: nombre,
    pdfBuffer,
    fileName: `libranza-${safeName}.pdf`,
    certBuffer,
    certFileName: `certificado-firma-${safeName}.pdf`,
    role: "cliente",
    templateKey: contract.templateKey as TemplateKey
  });
}



// async function renderHtmlToPdf(page: puppeteer.Page, html: string) {
//   await page.setContent(html, {
//     waitUntil: "domcontentloaded",
//     timeout: 30000,
//   });

//   await page.evaluate(async () => {
//     if ("fonts" in document) {
//       try {
//         await (document as any).fonts.ready;
//       } catch {}
//     }

//     const images = Array.from(document.images ?? []);

//     await Promise.all(
//       images.map((img) => {
//         if (img.complete) return Promise.resolve();

//         return new Promise<void>((resolve) => {
//           const done = () => resolve();
//           img.addEventListener("load", done, { once: true });
//           img.addEventListener("error", done, { once: true });
//           setTimeout(done, 5000);
//         });
//       })
//     );
//   });

//   return page.pdf({
//     format: "A4",
//     printBackground: true,
//     margin: { top: "0", right: "0", bottom: "0", left: "0" },
//     preferCSSPageSize: true,
//   });
// }