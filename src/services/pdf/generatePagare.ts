// src/services/pagare/generatePagarePdf.ts
import puppeteer from "puppeteer";
import { generatePagareHtml } from "./pagareHtml";
export async function generatePagarePdf(pagare: any): Promise<Buffer> {
  let browser;

  try {
    const html = await generatePagareHtml(pagare);
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
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.emulateMediaType("print");
    await page.evaluateHandle("document.fonts.ready");

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