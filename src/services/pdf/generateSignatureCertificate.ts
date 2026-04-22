import puppeteer from "puppeteer";
import { ContractCertData, generateCertificateHtml, SignerCertData } from "./generateCertificate";

export type { ContractCertData, SignerCertData };

export async function generateSignatureCertificatePdf(
  data: ContractCertData
): Promise<Buffer> {
  let browser;

  try {
    const html = generateCertificateHtml(data);
    const isProduction = process.env.NODE_ENV === "production";

    browser = await puppeteer.launch({
      headless: true,
      executablePath: isProduction
        ? process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium-browser"
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

    await page.evaluate(async () => {
      try {
        // @ts-ignore
        await document.fonts.ready;
      } catch { }

      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 5000);
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = undefined;

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch { }
    }
  }
}

/**
 * Construye el ContractCertData a partir del contrato de Prisma.
 * Llamar desde sendSignedContractPdf después de que el contrato está completamente firmado.
 */
export function buildCertDataFromContract(contract: {
  contractNumber?: string | null;
  title: string;
  consecutivo: string;
  amount: number;
  currency?: string | null;
  signers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    partyRole?: string | null;
    signatures: Array<{
      type: string;
      typedValue?: string | null;
      signedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
      documentHash?: string | null;
      otpVerified?: boolean;
    }>;
  }>;
}): ContractCertData {
  const signers: SignerCertData[] = contract.signers
    .filter((s) => s.signatures.length > 0)
    .map((s) => {
      const sig = s.signatures[0];
      return {
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.partyRole,
        signedAt: sig.signedAt,
        ipAddress: sig.ipAddress,
        userAgent: sig.userAgent,
        documentHash: sig.documentHash ?? "",
        signatureType: sig.type as SignerCertData["signatureType"],
        typedValue: sig.typedValue,
        otpVerified: sig.otpVerified ?? false,
      };
    });

  return {
    contractNumber: contract.contractNumber,
    title: contract.title,
    consecutivo: contract.consecutivo,
    amount: contract.amount,
    currency: contract.currency,
    generatedAt: new Date(),
    signers,
  };
}