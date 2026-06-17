import path from "node:path";
import fs from "node:fs";
import { getTemplateConfig, resolveTemplateKey } from "../../lib/email/templateConfig";
import {
  generateReciboConformidadHtml,
  ReciboConformidadForPdf,
} from "./reciboHtml";
import { renderPdf } from "./renderPDF";
import { fetchInternalLogoWithRetry } from "../../utils/fetchLogo";

// ─── Resolver logo local + fallback HTTP ─────────────────────────────────────

async function resolveLogoBase64(templateKey: string | null | undefined) {
  const resolvedTemplateKey = resolveTemplateKey(templateKey);
  const template = getTemplateConfig(resolvedTemplateKey);

  let logoBase64: string | undefined;
  let logoMime = "image/png";

  try {
    const logoRef = template.logoFile;

    const isRemoteLogo =
      logoRef?.startsWith("http://") || logoRef?.startsWith("https://");

    if (!isRemoteLogo) {
      const possibleDirs = [
        path.join(process.cwd(), "src", "public"),
        path.join(process.cwd(), "public"),
        path.join(process.cwd(), "src", "public", "assets"),
        path.join(process.cwd(), "public", "assets"),
      ];

      for (const dir of possibleDirs) {
        const logoPath = path.join(dir, logoRef);

        if (fs.existsSync(logoPath)) {
          logoBase64 = fs.readFileSync(logoPath).toString("base64");

          const ext = path.extname(logoPath).slice(1).toLowerCase();

          logoMime =
            ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "svg"
                ? "image/svg+xml"
                : ext === "webp"
                  ? "image/webp"
                  : "image/png";

          break;
        }
      }
    }

    if (!logoBase64) {
      const fallbackUrl = isRemoteLogo ? logoRef : template.logoEmailUrl;

      if (fallbackUrl) {
        console.warn(
          `[generateReciboPDF] Logo local no encontrado (${logoRef}). Intentando fallback HTTP...`
        );

        const result = await fetchInternalLogoWithRetry(fallbackUrl);

        if (result) {
          logoBase64 = result.base64;
          logoMime = result.mime;
        }
      }
    }
  } catch (e) {
    console.warn("[generateReciboPDF] Sin logo recibo:", e);
  }

  return { logoBase64, logoMime };
}

// ─── Generar PDF del recibo ───────────────────────────────────────────────────

export async function generateReciboConformidadPdf(
  recibo: ReciboConformidadForPdf
): Promise<Buffer> {

  const { logoBase64, logoMime } = await resolveLogoBase64(
    recibo.contract.templateKey
  );

  const html = generateReciboConformidadHtml(recibo, { logoBase64, logoMime });

  const pdf = await renderPdf(html);

  return pdf;
}