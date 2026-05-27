// src/services/pagare/generatePagarePdf.ts

import puppeteer from "puppeteer";
import { generatePagareHtml } from "./pagareHtml";

async function renderPagarePdf(html: string): Promise<Buffer> {
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

    await page
      .evaluateHandle("document.fonts?.ready")
      .catch(() => null);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
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

export async function generatePagarePdf(pagare: any): Promise<Buffer> {
  const html = await generatePagareHtml(pagare);

  try {
    return await renderPagarePdf(html);
  } catch (error) {
    console.warn("Primer intento generando pagaré falló. Reintentando...", error);

    return await renderPagarePdf(html);
  }
}