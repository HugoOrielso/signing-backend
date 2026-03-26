import fs from "fs";
import path from "path";

export function loadLogoBase64(templateKey?: string | null) {
  const key = (templateKey ?? "dimcultura").toLowerCase();

  const logos: Record<string, string> = {
    dimcultura: "dimcultura.webp",
    gruculcol: "gruculcol.webp",
  };

  const fileName = logos[key] ?? logos.dimcultura;

  const logoPath = path.join(process.cwd(), "public", "assets", fileName);

  if (!fs.existsSync(logoPath)) {
    return {
      logoBase64: undefined,
      logoMime: "image/webp",
    };
  }

  const buffer = fs.readFileSync(logoPath);

  return {
    logoBase64: buffer.toString("base64"),
    logoMime: "image/webp",
  };
}