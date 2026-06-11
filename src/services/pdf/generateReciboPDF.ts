import path from "node:path";
import fs from "node:fs";
import { getTemplateConfig } from "../../lib/email/templateConfig";
import { generateReciboConformidadHtml, ReciboConformidadForPdf } from "./reciboHtml";
import { renderPdf } from "./renderPDF";

// ─── Resolver logo (igual que en getEncryptedPDF) ────────────────────────────

async function resolveLogoBase64(templateKey: string | null | undefined) {
  const template = getTemplateConfig(templateKey);

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
      logoBase64 = Buffer.from(arrayBuffer).toString("base64");

      const contentType = response.headers.get("content-type");
      if (contentType) {
        logoMime = contentType;
      } else {
        const ext = path.extname(logoRef).slice(1).toLowerCase();
        logoMime =
          ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : ext === "png" ? "image/png"
          : ext === "svg" ? "image/svg+xml"
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
            ext === "jpg" || ext === "jpeg" ? "image/jpeg"
            : ext === "svg" ? "image/svg+xml"
            : `image/${ext || "webp"}`;
          break;
        }
      }
    }
  } catch (e) {
    console.warn("Sin logo recibo:", e);
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

  return renderPdf(html);
}