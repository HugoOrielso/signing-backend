import path from "node:path";
import fs from "node:fs";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { getTemplateConfig } from "../../lib/email/templateConfig";
import { generateLibranzaHtml } from "./libranza";
import { renderPdf } from "./renderPDF";

type PdfAudience = "client" | "admin";

export async function generateContractPdf(
  contract: any,
  password?: string,
  audience: PdfAudience = "client"
): Promise<Buffer> {
  const template = getTemplateConfig(contract.templateKey);

  const contractedSigner = contract.signers.find(
    (s: any) => s.partyRole === "DEUDOR"
  );

  const contractedSig = contractedSigner
    ? contract.signatures.find(
        (sig: any) => sig.signerId === contractedSigner.id
      )
    : undefined;

  const signatureData = contractedSig
    ? {
        type: contractedSig.type as "DRAWN" | "TYPED" | "CLICK_TO_SIGN",
        imageUrl: contractedSig.imageUrl ?? undefined,
        typedValue: contractedSig.typedValue ?? undefined,
        signedAt: contractedSig.signedAt?.toISOString(),
        signerName: contractedSigner?.name,
      }
    : undefined;

  let logoBase64: string | undefined;
  let logoMime = "image/webp";

  try {
    const logoRef = template.logoFile;

    if (logoRef?.startsWith("http://") || logoRef?.startsWith("https://")) {
      const response = await fetch(logoRef);

      if (!response.ok) {
        throw new Error(`No se pudo descargar el logo: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logoBase64 = buffer.toString("base64");

      const contentType = response.headers.get("content-type");

      if (contentType) {
        logoMime = contentType;
      } else {
        const ext = path.extname(logoRef).slice(1).toLowerCase();

        logoMime =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "png"
              ? "image/png"
              : ext === "svg"
                ? "image/svg+xml"
                : "image/webp";
      }
    } else {
      const possibleDirs = [
        path.join(process.cwd(), "public", "assets"),
        path.join(process.cwd(), "src", "public", "assets"),
      ];

      const assetsDir =
        possibleDirs.find((d) => fs.existsSync(d)) ?? possibleDirs[0];

      const candidates = [logoRef, "logo.webp", "logo.png", "logo.jpg"];

      for (const file of candidates) {
        if (!file) continue;

        const logoPath = path.join(assetsDir, file);

        if (fs.existsSync(logoPath)) {
          logoBase64 = fs.readFileSync(logoPath).toString("base64");

          const ext = path.extname(file).slice(1).toLowerCase();

          logoMime =
            ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "svg"
                ? "image/svg+xml"
                : `image/${ext || "webp"}`;

          break;
        }
      }
    }
  } catch (e) {
    console.warn("Sin logo:", e);
  }

  const html = await generateLibranzaHtml(contract.libranzaData, {
    templateKey: contract.templateKey,
    signature: signatureData,
    logoBase64,
    logoMime,
    audience,
    consecutivo: contract.consecutivo,
  });

  let pdfBuffer: Buffer;

  try {
    pdfBuffer = await renderPdf(html);
  } catch (error) {
    console.warn("Primer intento generando contrato falló. Reintentando...", error);

    pdfBuffer = await renderPdf(html);
  }

  if (password) {
    const encrypted = await encryptPDF(
      new Uint8Array(pdfBuffer),
      password,
      `${password}_owner`
    );

    return Buffer.from(encrypted);
  }

  return pdfBuffer;
}