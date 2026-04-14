import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer";
import type { Response, Request } from "express";

import { prisma } from "../../../../../database/db";
import { generateLibranzaHtml } from "../../../../../services/pdf/libranza";
import { getTemplateConfig } from "../../../../../lib/email/templateConfig";

export async function downloadPublicSignedContract(req: Request, res: Response) {
  let browser;
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["PARTIALLY_SIGNED", "SIGNED"] },
      },
      include: {
        parties: true,
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: true,
        libranzaData: {
          include: {
            references: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "El contrato no está disponible para descarga (debe estar firmado)",
      });
    }

    if (!contract.libranzaData) {
      return res.status(400).json({
        ok: false,
        message: "Este contrato no tiene datos de libranza",
      });
    }

    const template = getTemplateConfig(contract.templateKey);

    const contractedSigner = contract.signers.find((s) => s.partyRole === "DEUDOR");
    const contractedSig = contractedSigner
      ? contract.signatures.find((sig) => sig.signerId === contractedSigner.id)
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
      const possibleDirs = [
        path.join(process.cwd(), "public", "assets"),
        path.join(process.cwd(), "src", "public", "assets"),
        path.join(__dirname, "..", "public", "assets"),
        path.join(__dirname, "..", "..", "public", "assets"),
      ];

      const assetsDir = possibleDirs.find((d) => fs.existsSync(d)) ?? possibleDirs[0];

      const candidates = [
        template.logoFile,
        "logo.webp",
        "logo.png",
        "logo.jpg",
        "logo.jpeg",
      ];

      for (const file of candidates) {
        const logoPath = path.join(assetsDir, file);
        if (fs.existsSync(logoPath)) {
          logoBase64 = fs.readFileSync(logoPath).toString("base64");
          const ext = path.extname(file).slice(1).toLowerCase();
          logoMime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          break;
        }
      }
    } catch (e) {
      console.warn("Sin logo:", e);
    }


    const html = await  generateLibranzaHtml(contract.libranzaData as any, {
      templateKey: contract.templateKey,
      signature: signatureData,
      logoBase64,
      logoMime,
    });

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = undefined;

    const clienteName =
      contract.libranzaData.clienteNombre ??
      contract.parties.find((p) => p.role === "DEUDOR")?.name ??
      "libranza";

    const safeName = clienteName
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const fileName = `libranza-${safeName}.pdf`;

    const encodedName = encodeURIComponent(fileName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(Buffer.from(pdfBuffer));
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close();
      } catch { }
    }

    console.error("DOWNLOAD PDF ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo generar el PDF",
      error: error?.message ?? "Error desconocido",
    });
  }
}