import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer";

import {
  ContractCertData,
  generateCertificateHtml,
  SignerCertData,
} from "./generateCertificate";

import {
  getTemplateConfig,
  resolveTemplateKey,
} from "../../lib/email/templateConfig";

export type { ContractCertData, SignerCertData };

type LocalLogoResult = {
  base64: string;
  mime: string;
};

function getLocalTemplateLogo(
  templateKey?: string | null
): LocalLogoResult | null {
  const resolvedTemplateKey = resolveTemplateKey(templateKey);
  const template = getTemplateConfig(resolvedTemplateKey);
  const logoRef = template.logoFile;

  const possiblePaths = [
    path.join(process.cwd(), "src", "public", logoRef),
    path.join(process.cwd(), "public", logoRef),
    path.join(process.cwd(), "src", "public", "assets", logoRef),
    path.join(process.cwd(), "public", "assets", logoRef),
  ];

  for (const logoPath of possiblePaths) {
    if (!fs.existsSync(logoPath)) {
      continue;
    }

    const ext = path.extname(logoPath).slice(1).toLowerCase();

    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "svg"
          ? "image/svg+xml"
          : ext === "webp"
            ? "image/webp"
            : "image/png";

    const base64 = fs.readFileSync(logoPath).toString("base64");


    return {
      base64,
      mime,
    };
  }

  console.warn("[CERT LOGO LOCAL] Logo no encontrado", {
    templateKey: resolvedTemplateKey,
    logoRef,
    possiblePaths,
  });

  return null;
}

export async function generateSignatureCertificatePdf(
  data: ContractCertData
): Promise<Buffer> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const logo = getLocalTemplateLogo(data.templateKey);

    const html = generateCertificateHtml(data, {
      logoBase64: logo?.base64,
      logoMime: logo?.mime,
    });

    const isProduction = process.env.NODE_ENV === "production";

    browser = await puppeteer.launch({
      headless: true,
      executablePath: isProduction
        ? process.env.PUPPETEER_EXECUTABLE_PATH ??
          "/usr/bin/chromium-browser"
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

    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(30_000);

    page.on("request", (request) => {
      const url = request.url();

      if (url.startsWith("http://") || url.startsWith("https://")) {
        console.warn("[CERT EXTERNAL REQUEST]", url);
      }
    });

    page.on("requestfailed", (request) => {
      console.warn("[CERT REQUEST FAILED]", {
        url: request.url(),
        error: request.failure()?.errorText,
      });
    });

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const rawPdf = await page.pdf({
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

    const pdfBuffer = Buffer.from(rawPdf);


    return pdfBuffer;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.warn("[CERT BROWSER CLOSE ERROR]", error);
      }
    }
  }
}

export function buildCertDataFromContract(contract: {
  contractNumber?: string | null;
  title: string;
  consecutivo: string;
  amount: number;
  currency?: string | null;
  templateKey?: string | null;
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
    .filter((signer) => signer.signatures.length > 0)
    .map((signer) => {
      const signature = signer.signatures[0];

      return {
        name: signer.name,
        email: signer.email,
        phone: signer.phone,
        role: signer.partyRole,
        signedAt: signature.signedAt,
        ipAddress: signature.ipAddress,
        userAgent: signature.userAgent,
        documentHash: signature.documentHash ?? "",
        signatureType:
          signature.type as SignerCertData["signatureType"],
        typedValue: signature.typedValue,
        otpVerified: signature.otpVerified ?? false,
      };
    });

  return {
    contractNumber: contract.contractNumber,
    title: contract.title,
    consecutivo: contract.consecutivo,
    amount: contract.amount,
    currency: contract.currency,
    generatedAt: new Date(),
    templateKey: contract.templateKey,
    signers,
  };
}