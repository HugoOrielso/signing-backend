import path from "node:path";
import fs from "node:fs";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { getTemplateConfig, resolveTemplateKey } from "../../lib/email/templateConfig";
import { generateLibranzaHtml } from "./libranza";
import { renderPdf } from "./renderPDF";
import { fetchInternalLogoWithRetry } from "../../utils/fetchLogo";

type PdfAudience = "client" | "admin";

export async function generateContractPdf(
  contract: any,
  password?: string,
  audience: PdfAudience = "client"
): Promise<Buffer> {
  const templateKey = resolveTemplateKey(contract.templateKey);
  const template = getTemplateConfig(templateKey);

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
  let logoMime = "image/png";

  try {
    const logoRef = template.logoFile;

    const possibleDirs = [
      path.join(process.cwd(), "src", "public"),
      path.join(process.cwd(), "public"),
      path.join(process.cwd(), "src", "public", "assets"),
      path.join(process.cwd(), "public", "assets"),
    ];

    let logoFound = false;

    for (const dir of possibleDirs) {
      const logoPath = path.join(dir, logoRef);

      if (fs.existsSync(logoPath)) {
        const ext = path.extname(logoPath).slice(1).toLowerCase();

        logoBase64 = fs.readFileSync(logoPath).toString("base64");

        logoMime =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "svg"
              ? "image/svg+xml"
              : ext === "webp"
                ? "image/webp"
                : "image/png";


        logoFound = true;
        break;
      }
    }

    /**
     * Fallback remoto
     * Solo entra aquí si no encontró el archivo local
     */
    if (!logoFound) {
      console.warn(
        `[generateContractPdf] Logo local no encontrado (${logoRef}). Intentando fallback remoto...`
      );

      const result = await fetchInternalLogoWithRetry(logoRef);

      if (result) {
        logoBase64 = result.base64;
        logoMime = result.mime;
      }
    }
  } catch (e) {
    console.warn("[generateContractPdf] Sin logo:", e);
  }

  const html = await generateLibranzaHtml(contract.libranzaData, {
    templateKey,
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
    console.warn(
      "Primer intento generando contrato falló. Reintentando...",
      error
    );

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