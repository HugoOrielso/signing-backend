import { Request, Response } from "express";
import { prisma } from "../../database/db";
import { AuthenticatedRequest } from "../../types/types"
import { generatePublicToken } from "../../lib/token/generateToken";
import { sendContractEmail, sendLibranzaEmail, sendSignedContractEmail } from "../../lib/email/sendContract";
import puppeteer from "puppeteer";
import { generateLibranzaHtml } from "../../services/pdf/libranza";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cloudinary from "../../config/cloudinary";

export async function createContract(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ ok: false, message: "Usuario no autenticado" });
    }

    const body = req.body;
    const isLibranza = !body.generalData && body.contractType === "LIBRANZA";
    const isNewFormat = !body.generalData;

    // ── Tipos ──────────────────────────────────────────────────────────────────
    let contractData: {
      title: string; contractNumber?: string | null; contractType?: string | null;
      startDate?: Date | null; endDate?: Date | null; subject?: string | null;
      amount?: number | null; currency?: string; paymentMethod?: string | null;
    };

    let partiesInput: Array<{
      role: "CONTRACTOR" | "CONTRACTED"; name: string;
      identification?: string | null; email?: string | null;
      phone?: string | null; address?: string | null;
    }>;

    let signersInput: Array<{
      name: string; email?: string; phone?: string; roleTitle?: string;
      partyRole?: "CONTRACTOR" | "CONTRACTED"; signerOrder?: number;
      signed?: boolean; sigType?: string; sigData?: string;
    }>;

    let clausesInput: Array<{ content: string; position?: number }> = [];
    let libranzaInput: Record<string, any> | null = null;
    let sendTo = "";
    let clienteNombre = "";
    let asesor: string | undefined;

    if (isNewFormat) {
      const rawAmount = body.amount;
      let parsedAmount: number | null = null;
      if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
        const n = typeof rawAmount === "number"
          ? rawAmount
          : Number(String(rawAmount).replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(n)) parsedAmount = n;
      }

      contractData = {
        title: body.title,
        contractNumber: body.contractNumber ?? null,
        contractType: body.contractType ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        subject: body.subject ?? null,
        amount: parsedAmount,
        currency: body.currency ?? "COP",
        paymentMethod: body.paymentMethod ?? null,
      };

      partiesInput = body.parties ?? [];
      signersInput = body.signers ?? [];

      const contractedSigner = signersInput.find(s => s.partyRole === "CONTRACTED");
      const contractedParty = partiesInput.find(p => p.role === "CONTRACTED");

      sendTo = contractedSigner?.email ?? contractedParty?.email ?? "";
      clienteNombre = contractedSigner?.name ?? contractedParty?.name ?? body.clienteNombre ?? "";
      asesor = body.asesor ?? undefined;

      if (isLibranza) {
        libranzaInput = {
          // Encabezado
          ciudad: body.ciudad ?? null,
          asesor: body.asesor ?? null,
          fecha: body.fecha ?? null,

          // Datos personales — prioridad: campo directo > party CONTRACTED
          clienteNombre: body.clienteNombre ?? contractedParty?.name ?? null,
          clienteCC: body.clienteCC ?? contractedParty?.identification ?? null,
          clienteCCDe: body.clienteCCDe ?? null,
          clienteDireccion: body.clienteDireccion ?? contractedParty?.address ?? null,
          clienteTelefono: body.clienteTelefono ?? contractedParty?.phone ?? null,
          clienteEmail: body.clienteEmail ?? contractedParty?.email ?? null,
          clienteFuncionario: body.clienteFuncionario ?? null,
          clienteDesdeHace: body.clienteDesdeHace ?? null,

          // Datos laborales
          municipioTrabajo: body.municipioTrabajo ?? null,
          empresaTrabajo: body.empresaTrabajo ?? null,
          departamento: body.departamento ?? null,

          // Financiero
          sumaTotal: body.sumaTotal ?? null,
          numeroCuotas: body.numeroCuotas ?? null,
          valorCuota: body.valorCuota ?? null,
          mesCobro: body.mesCobro ?? null,

          // Bancario
          tipoCuenta: body.tipoCuenta ?? null,
          numeroCuenta: body.numeroCuenta ?? null,
          banco: body.banco ?? null,

          // Productos y forma de pago
          productos: Array.isArray(body.productos) ? body.productos : [],
          formaPago: body.formaPago ?? null,
        };

      }

    } else {
      const { generalData, clauses, signers } = body;

      const rawAmount = String(generalData.amount ?? "").trim();
      const normalized = rawAmount
        .replace(/\s/g, "").replace(/\$/g, "").replace(/COP/gi, "")
        .replace(/\./g, "").replace(",", ".");
      let parsedAmount: number | null = null;
      if (normalized !== "") {
        const n = Number(normalized);
        if (Number.isNaN(n))
          return res.status(400).json({ ok: false, message: "El monto debe ser un número válido" });
        if (n > 9999999999.99 || n < -9999999999.99)
          return res.status(400).json({ ok: false, message: "El monto excede el rango permitido" });
        parsedAmount = n;
      }

      contractData = {
        title: generalData.title,
        contractNumber: generalData.contractNumber ?? null,
        contractType: generalData.contractType ?? null,
        startDate: generalData.startDate ? new Date(generalData.startDate) : null,
        endDate: generalData.endDate ? new Date(generalData.endDate) : null,
        subject: generalData.subject ?? null,
        amount: parsedAmount,
        currency: generalData.currency ?? "COP",
        paymentMethod: generalData.paymentMethod ?? null,
      };

      partiesInput = [
        {
          role: "CONTRACTOR", name: generalData.contractorName,
          identification: generalData.contractorIdentification ?? null,
          email: generalData.contractorEmail ?? null,
          phone: generalData.contractorPhone ?? null,
          address: generalData.contractorAddress ?? null
        },
        {
          role: "CONTRACTED", name: generalData.contractedName,
          identification: generalData.contractedIdentification ?? null,
          email: generalData.contractedEmail ?? null,
          phone: generalData.contractedPhone ?? null,
          address: generalData.contractedAddress ?? null
        },
      ];

      clausesInput = clauses ?? [];
      signersInput = signers ?? [];
      sendTo = generalData.contractedEmail ?? "";
      clienteNombre = generalData.contractedName ?? "";
    }

    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        adminId,

        parties: {
          create: partiesInput.map(p => ({
            role: p.role,
            name: p.name,
            identification: p.identification ?? null,
            email: p.email ?? null,
            phone: p.phone ?? null,
            address: p.address ?? null,
          })),
        },

        ...(clausesInput.length > 0 ? {
          clauses: {
            create: clausesInput
              .filter(c => c.content?.trim())
              .map((c, i) => ({ position: c.position ?? i + 1, content: c.content })),
          },
        } : {}),

        signers: {
          create: signersInput.map((s, i) => ({
            name: s.name,
            email: s.email ?? null,
            phone: s.phone ?? null,
            roleTitle: s.roleTitle ?? null,
            partyRole: s.partyRole ?? null,
            signerOrder: s.signerOrder ?? i + 1,
          })),
        },

        ...(libranzaInput ? {
          libranzaData: { create: libranzaInput },
        } : {}),
      },
      include: { signers: true },
    });

    // ── Firmas inline (wizard viejo) ──────────────────────────────────────────
    for (const [index, signer] of signersInput.entries()) {
      if (!signer.signed || !signer.sigType || !signer.sigData) continue;
      const dbSigner = contract.signers.find(
        s => s.signerOrder === (signer.signerOrder ?? index + 1)
      );
      if (!dbSigner) continue;
      await prisma.signature.create({
        data: {
          contractId: contract.id,
          signerId: dbSigner.id,
          type: signer.sigType === "canvas" ? "DRAWN" : "TYPED",
          typedValue: signer.sigType === "typed" ? signer.sigData : null,
          imageUrl: signer.sigType === "canvas" ? signer.sigData : null,
          signedAt: new Date(),
        },
      });
    }

    // ── Generar token de firma pública ────────────────────────────────────────
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    await prisma.contract.update({
      where: { id: contract.id },
      data: { token, tokenExpiresAt, status: "SENT" },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const signingLink = `${frontendUrl}/contracts/auth/${token}`;

    if (sendTo) {
      try {
        if (isNewFormat) {
          await sendLibranzaEmail({ to: sendTo, clienteNombre, asesor, signingLink });
        } else {
          await sendContractEmail({
            to: sendTo,
            contractTitle: contractData.title,
            contractorName: partiesInput.find(p => p.role === "CONTRACTOR")?.name ?? "Contratante",
            signingLink,
          });
        }
      } catch (emailError: any) {
        console.error("EMAIL ERROR (contrato creado):", emailError?.message);
      }
    }

    return res.status(201).json({
      ok: true,
      contractId: contract.id,
      token,
      signingLink,
      emailSent: !!sendTo,
    });

  } catch (error: any) {
    console.error("CREATE CONTRACT ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el contrato",
      error: error?.message ?? "Error desconocido",
    });
  }
}

export async function listContracts(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const contracts = await prisma.contract.findMany({
      where: { adminId },
      orderBy: { createdAt: "desc" },
      include: {
        parties: true,
        libranzaData: true,
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: {
          select: {
            id: true, signerId: true, type: true,
            typedValue: true, signedAt: true,
          },
        },
      },
    });

    return res.json({ ok: true, data: contracts });
  } catch (error: any) {
    console.error("LIST CONTRACTS ERROR", error);
    return res.status(500).json({ ok: false, message: "No se pudieron obtener los contratos" });
  }
}

export async function sendContract(req: AuthenticatedRequest, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        adminId,
      },
      include: {
        parties: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    const contractedParty = contract.parties.find(
      (p) => p.role === "CONTRACTED"
    );

    const contractorParty = contract.parties.find(
      (p) => p.role === "CONTRACTOR"
    );

    if (!contractedParty?.email) {
      return res.status(400).json({
        ok: false,
        message: "El contratado no tiene email",
      });
    }

    const token = generatePublicToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        token,
        tokenExpiresAt,
        status: "SENT",
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const signingLink = `${frontendUrl}/contracts/sign/${token}`;
    console.log(contractedParty.email)
    console.log(contractedParty)
    await sendContractEmail({
      to: contractedParty.email,
      contractTitle: contract.title || contract.contractType || "Contrato",
      contractorName: contractorParty?.name || "Contratante",
      signingLink,
    });

    return res.json({
      ok: true,
      message: "Contrato enviado correctamente",
      signingLink,
    });
  } catch (error: any) {
    console.error("SEND CONTRACT ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo enviar el contrato",
      error: error?.message || "Error desconocido",
    });
  }
}

export async function getPublicContract(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;


    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED", "SIGNED"] },
      },
      include: {
        parties: true,
        clauses: { orderBy: { position: "asc" } },
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: true,
        libranzaData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "El enlace expiró" });
    }

    if (contract.status === "SENT") {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "VIEWED" },
      });
      contract.status = "VIEWED";
    }

    return res.json({ ok: true, contract });

  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo consultar el contrato" });
  }
}

export async function signPublicContract(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { type, typedValue, imageUrl } = req.body as {
      type: "TYPED" | "DRAWN";
      typedValue?: string;
      imageUrl?: string;
    };

    if (!type || !["TYPED", "DRAWN"].includes(type)) {
      return res.status(400).json({
        ok: false,
        message: "El tipo de firma es requerido y debe ser TYPED o DRAWN",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: { token, status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] } },
      include: {
        signers: true,
        signatures: true,
        parties: true,
        libranzaData: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado o ya no disponible para firma",
      });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        ok: false,
        message: "El enlace expiró",
      });
    }

    const signer = contract.signers.find((s) => s.partyRole === "CONTRACTED");
    if (!signer) {
      return res.status(400).json({
        ok: false,
        message: "No existe un firmante público válido",
      });
    }

    const alreadySigned = contract.signatures.some((sig) => sig.signerId === signer.id);
    if (alreadySigned) {
      return res.status(400).json({
        ok: false,
        message: "Este contrato ya fue firmado por la otra parte",
      });
    }

    if (type === "TYPED" && !typedValue?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "La firma escrita es requerida",
      });
    }

    if (type === "DRAWN" && !imageUrl?.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "La imagen de la firma es requerida y debe ser válida",
      });
    }

    // Hash del documento al momento exacto de la firma
    const signedAt = new Date();

    const documentContent = JSON.stringify({
      contractId: contract.id,
      contractTitle: contract.title,
      libranzaData: contract.libranzaData,
      signedAt: signedAt.toISOString(),
    });

    const documentHash = crypto
      .createHash("sha256")
      .update(documentContent)
      .digest("hex");

    const signerEmail =
      signer.email ??
      contract.parties.find((p) => p.role === "CONTRACTED")?.email ??
      null;

    const otpVerified = req.headers["x-otp-verified"] === "true";

    let uploadedSignatureUrl: string | null = null;
    let uploadedSignaturePublicId: string | null = null;
    let uploadedSignatureMimeType: string | null = null;

    if (type === "DRAWN" && imageUrl) {
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const folder = getSignatureFolder(contract.id);

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder,
        resource_type: "image",
        public_id: `signature-${signer.id}-${Date.now()}-${randomSuffix}`,
        use_filename: false,
      });

      uploadedSignatureUrl = uploadResult.secure_url;
      uploadedSignaturePublicId = uploadResult.public_id;
      uploadedSignatureMimeType = uploadResult.format
        ? `image/${uploadResult.format}`
        : "image/png";
    }

    await prisma.signature.create({
      data: {
        contractId: contract.id,
        signerId: signer.id,
        type,
        typedValue: type === "TYPED" ? typedValue!.trim() : null,
        imageUrl: type === "DRAWN" ? uploadedSignatureUrl : null,
        signaturePublicId: type === "DRAWN" ? uploadedSignaturePublicId : null,
        mimeType: type === "DRAWN" ? uploadedSignatureMimeType : null,
        signedAt,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        documentHash,
        signerEmail,
        otpVerified,
      },
    });

    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id },
      include: { signatures: true },
    });

    const allSigned = allSigners.every((s) => !s.partyRole || s.signatures.length > 0);

    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: allSigned ? "SIGNED" : "PARTIALLY_SIGNED" },
    });


    if (allSigned) {
      try {
        const clienteNombre =
          contract.libranzaData?.clienteNombre ?? signer.name ?? "Cliente";
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const downloadLink = `${frontendUrl}/contracts/sign/${token}`;

        if (signerEmail) {
          await sendSignedContractEmail({
            to: signerEmail,
            clienteNombre,
            downloadLink,
            role: "cliente",
          });
        }

        const adminEmail = contract.parties.find((p) => p.role === "CONTRACTOR")?.email;
        if (adminEmail) {
          await sendSignedContractEmail({
            to: adminEmail,
            clienteNombre,
            downloadLink,
            role: "admin",
          });
        }
      } catch (emailErr: any) {
        console.error("EMAIL POST-FIRMA ERROR:", emailErr?.message);
      }
    }

    return res.json({
      ok: true,
      message: allSigned
        ? "Contrato firmado completamente"
        : "Firma registrada correctamente",
      status: updatedContract.status,
      documentHash,
    });
  } catch (error) {
    console.error("SIGN PUBLIC CONTRACT ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar la firma",
    });
  }
}

function getSignatureFolder(contractId: string) {
  return `contracts/${contractId}/signatures`;
}

export async function downloadPublicSignedContract(req: Request, res: Response) {
  let browser;
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    // Traer contrato — permitir descarga también si está PARTIALLY_SIGNED
    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["PARTIALLY_SIGNED", "SIGNED"] },
      },
      include: {
        parties: true,
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: true,
        libranzaData: true,
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

    // ── Obtener la firma del contratado ──────────────────────────────────────
    const contractedSigner = contract.signers.find(s => s.partyRole === "CONTRACTED");
    const contractedSig = contractedSigner
      ? contract.signatures.find(sig => sig.signerId === contractedSigner.id)
      : undefined;

    const signatureData = contractedSig ? {
      type: contractedSig.type as "DRAWN" | "TYPED" | "CLICK_TO_SIGN",
      imageUrl: contractedSig.imageUrl ?? undefined,
      typedValue: contractedSig.typedValue ?? undefined,
      signedAt: contractedSig.signedAt?.toISOString(),
      signerName: contractedSigner?.name,
    } : undefined;

    // ── Cargar logo en base64 (detecta webp, png, jpg automáticamente) ────────
    let logoBase64: string | undefined;
    let logoMime = "image/webp";
    try {
      // Buscar en múltiples rutas posibles según la estructura del proyecto
      const possibleDirs = [
        path.join(process.cwd(), "public", "assets"),        // backend/public/assets
        path.join(process.cwd(), "src", "public", "assets"), // backend/src/public/assets
        path.join(__dirname, "..", "public", "assets"),       // relativo al archivo compilado
        path.join(__dirname, "..", "..", "public", "assets"), // un nivel más arriba
      ];
      const assetsDir = possibleDirs.find(d => fs.existsSync(d)) ?? possibleDirs[0];
      console.log("Assets dir:", assetsDir);
      const candidates = ["logo.webp", "logo.png", "logo.jpg", "logo.jpeg"];
      for (const file of candidates) {
        const logoPath = path.join(assetsDir, file);
        if (fs.existsSync(logoPath)) {
          logoBase64 = fs.readFileSync(logoPath).toString("base64");
          const ext = path.extname(file).slice(1).toLowerCase();
          logoMime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          console.log(`Logo cargado: ${file} (${logoMime})`);
          break;
        }
      }
    } catch (e) { console.warn("Sin logo:", e); }

    // ── Generar HTML ──────────────────────────────────────────────────────────
    const html = generateLibranzaHtml(
      contract.libranzaData as any,
      signatureData,
      logoBase64,
      logoMime
    );

    // ── Puppeteer → PDF ───────────────────────────────────────────────────────
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

    // Cargar el HTML con fuentes de Google
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    // Esperar que cargue la fuente Dancing Script (para firmas escritas)
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = undefined;

    // ── Responder ─────────────────────────────────────────────────────────────
    const clienteName = contract.libranzaData.clienteNombre
      ?? contract.parties.find(p => p.role === "CONTRACTED")?.name
      ?? "libranza";

    const safeName = clienteName.replace(/[^\w\s-]/gi, "").replace(/\s+/g, "-").toLowerCase();
    const fileName = `libranza-${safeName}.pdf`;

    const encodedName = encodeURIComponent(fileName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    console.error("DOWNLOAD PDF ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo generar el PDF",
      error: error?.message ?? "Error desconocido",
    });
  }
}


export const getContractById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role   = req.user?.role;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const id = String(req.params.id);

    const contract = await prisma.contract.findUnique({
      where: {
        id,
        ...(role === "OPERATOR" && { adminId: userId }),
      },
      include: {
        parties: true,
        libranzaData: true,
        signers: { orderBy: { signerOrder: "asc" } },
        signatures: {
          select: {
            id: true, signerId: true, type: true,
            typedValue: true, signedAt: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
    }

    return res.json({ ok: true, data: contract });
  } catch (error: any) {
    console.error("GET CONTRACT BY ID ERROR", error);
    return res.status(500).json({ ok: false, message: "Error al obtener el contrato" });
  }
};