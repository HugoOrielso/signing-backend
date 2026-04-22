import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { getTemplateConfig } from "../../lib/email/templateConfig";
import { generateLibranzaHtml } from "./libranza";

export async function generateContractPdf(
  contract: any,
  password?: string
): Promise<Buffer> {
  let browser;

  try {
    const template = getTemplateConfig(contract.templateKey);

    const contractedSigner = contract.signers.find(
      (s: any) => s.partyRole === "DEUDOR"
    );

    const contractedSig = contractedSigner
      ? contract.signatures.find((sig: any) => sig.signerId === contractedSigner.id)
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
    });

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
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForFunction(
      `Array.from(document.images).every(img => img.complete)`,
      { timeout: 5000 }
    ).catch(() => null);
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = undefined;

    if (password) {
      const encrypted = await encryptPDF(
        new Uint8Array(pdfBuffer),
        password,
        `${password}_owner`
      );
      return Buffer.from(encrypted);
    }

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch { }
    }
  }
}