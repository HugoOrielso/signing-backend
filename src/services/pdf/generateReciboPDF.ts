// src/services/recibo/generateReciboPDF.ts

import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer";
import { getTemplateConfig } from "../../lib/email/templateConfig";
import {
  generateReciboConformidadHtml,
  ReciboConformidadForPdf,
} from "./reciboHtml";

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
    console.warn("Sin logo recibo:", e);
  }

  return {
    template,
    logoBase64,
    logoMime,
  };
}

async function renderReciboPdf(html: string): Promise<Buffer> {
  let browser;
  let page;

  try {
    const isProduction = process.env.NODE_ENV === "production";

    browser = await puppeteer.launch({
      headless: true,
      executablePath: isProduction
        ? process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser"
        : undefined,
      args: isProduction
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
          ]
        : [],
    });

    page = await browser.newPage();

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page
      .waitForFunction(
        `Array.from(document.images).every(img => img.complete || img.naturalWidth > 0)`,
        { timeout: 5000 }
      )
      .catch(() => null);

    await page.emulateMediaType("print");

    await page.evaluateHandle("document.fonts?.ready").catch(() => null);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {}
    }

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

export async function generateReciboConformidadPdf(
  recibo: ReciboConformidadForPdf
): Promise<Buffer> {
  const { logoBase64, logoMime } = await resolveLogoBase64(
    recibo.contract.templateKey
  );

  const html = generateReciboConformidadHtml(recibo, {
    logoBase64,
    logoMime,
  });

  try {
    return await renderReciboPdf(html);
  } catch (error) {
    console.warn("Primer intento generando recibo falló. Reintentando...", error);

    return await renderReciboPdf(html);
  }
}