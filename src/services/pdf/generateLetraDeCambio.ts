import puppeteer from "puppeteer";
import { generateLetraCambioHtml, LetraCambioForPdf } from "./letraDeCambioHtml";

export async function generateLetraCambioPdf(
  letraCambio: LetraCambioForPdf
): Promise<Buffer> {
  let browser;

  try {
    const html = generateLetraCambioHtml(letraCambio);

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
          ]
        : [],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page
      .waitForFunction(
        `Array.from(document.images).every(img => img.complete)`,
        { timeout: 5000 }
      )
      .catch(() => null);

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

    await browser.close();
    browser = undefined;

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}