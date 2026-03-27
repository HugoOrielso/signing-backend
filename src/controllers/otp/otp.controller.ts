// src/controllers/contracts/otp.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "../../database/db";
import {
  trackOtpSent,
  trackOtpVerified,
} from "../../services/audit/contract-audit.service";
import { getAuditRequestContext } from "../../utils/audit-request";

const resend = new Resend(process.env.RESEND_API_KEY);

const otpStore = new Map<
  string,
  { code: string; expiresAt: number; attempts: number }
>();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function storeKey(contractId: string, email: string) {
  return `${contractId}:${email.toLowerCase()}`;
}

function getContractedIdentity(contract: {
  signers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    partyRole: string | null;
  }>;
  parties: Array<{
    name: string | null;
    email: string | null;
    role: string;
  }>;
}, emailNorm: string) {
  const contractedSigner = contract.signers.find(
    (signer) =>
      signer.partyRole === "CONTRACTED" &&
      signer.email?.toLowerCase() === emailNorm
  );

  const contractedParty = contract.parties.find(
    (party) =>
      party.role === "CONTRACTED" &&
      party.email?.toLowerCase() === emailNorm
  );

  return {
    signerId: contractedSigner?.id ?? null,
    actorName: contractedSigner?.name ?? contractedParty?.name ?? null,
    actorEmail: contractedSigner?.email ?? contractedParty?.email ?? emailNorm,
  };
}

// ── POST /contracts/public/:token/request-otp ─────────────────────────────────
export async function requestOtp(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { email } = req.body as { email?: string };

    if (!email?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "El correo es requerido",
      });
    }

    const emailNorm = email.trim().toLowerCase();

    const contract = await prisma.contract.findFirst({
      where: {
        token,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED", "SIGNED"] },
      },
      include: {
        signers: true,
        parties: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        ok: false,
        message: "El enlace ha expirado",
      });
    }

    const validEmails = [
      ...contract.signers
        .filter((signer) => signer.partyRole === "CONTRACTED")
        .map((signer) => signer.email?.toLowerCase())
        .filter(Boolean),
      ...contract.parties
        .filter((party) => party.role === "CONTRACTED")
        .map((party) => party.email?.toLowerCase())
        .filter(Boolean),
    ] as string[];

    if (!validEmails.includes(emailNorm)) {
      return res.json({
        ok: true,
        message: "Si ese correo está registrado, recibirás un código.",
      });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const key = storeKey(contract.id, emailNorm);

    otpStore.set(key, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: emailNorm,
      subject: "Tu código de verificación — Dimcultura S.A.S",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
            <div style="height:3px;background:linear-gradient(90deg,#c9a84c,#a07830);margin-bottom:20px;border-radius:2px;"></div>
            <p style="color:#c9a84c;font-size:18px;font-weight:700;margin:0;">Dimcultura S.A.S</p>
            <p style="color:#5a5a7a;font-size:12px;margin:4px 0 0;font-style:italic;">"Un mundo en el que debes estar"</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a1a2e;font-size:15px;margin:0 0 8px;">Hola,</p>
            <p style="color:#4a4a6a;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Usa este código para verificar tu identidad y acceder a tu libranza digital.
              El código expira en <strong>10 minutos</strong>.
            </p>
            <div style="background:#f5f0e8;border:2px solid #c9a84c;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="font-size:36px;font-weight:900;letter-spacing:10px;color:#1a1a2e;margin:0;font-family:monospace;">
                ${code}
              </p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
              Si no solicitaste este código, ignora este correo.
            </p>
          </div>
        </div>
      `,
    });

    try {
      const auditContext = getAuditRequestContext(req);
      const identity = getContractedIdentity(contract, emailNorm);

      await trackOtpSent({
        contractId: contract.id,
        signerId: identity.signerId,
        actorName: identity.actorName,
        actorEmail: identity.actorEmail,
        ...auditContext,
        contractStatus: contract.status,
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - OTP_SENT:", auditError);
    }

    return res.json({
      ok: true,
      message: "Si ese correo está registrado, recibirás un código.",
    });
  } catch (error: any) {
    console.error("REQUEST OTP ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al procesar la solicitud",
    });
  }
}

// ── POST /contracts/public/:token/verify-otp ──────────────────────────────────
export async function verifyOtp(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    const { email, code } = req.body as { email?: string; code?: string };

    if (!email?.trim() || !code?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Correo y código son requeridos",
      });
    }

    const emailNorm = email.trim().toLowerCase();

    const contract = await prisma.contract.findFirst({
      where: { token },
      include: {
        signers: true,
        parties: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        ok: false,
        message: "El enlace ha expirado",
      });
    }

    const key = storeKey(contract.id, emailNorm);
    const entry = otpStore.get(key);

    if (!entry) {
      return res.status(400).json({
        ok: false,
        message: "Código inválido o expirado. Solicita uno nuevo.",
      });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({
        ok: false,
        message: "El código ha expirado. Solicita uno nuevo.",
      });
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(key);
      return res.status(429).json({
        ok: false,
        message: "Demasiados intentos. Solicita un nuevo código.",
      });
    }

    if (entry.code !== code.trim()) {
      entry.attempts += 1;
      otpStore.set(key, entry);

      const left = MAX_ATTEMPTS - entry.attempts;

      return res.status(400).json({
        ok: false,
        message: `Código incorrecto. ${left} intento${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}.`,
      });
    }

    otpStore.delete(key);

    try {
      const auditContext = getAuditRequestContext(req);
      const identity = getContractedIdentity(contract, emailNorm);

      await trackOtpVerified({
        contractId: contract.id,
        signerId: identity.signerId,
        actorName: identity.actorName,
        actorEmail: identity.actorEmail,
        ...auditContext,
      });
    } catch (auditError) {
      console.error("AUDIT ERROR - OTP_VERIFIED:", auditError);
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");

    const nextRoute =
      contract.status === "SIGNED"
        ? `/contracts/view/${token}`
        : `/contracts/sign/${token}`;

    return res.json({
      ok: true,
      sessionToken,
      email: emailNorm,
      nextRoute,
      message: "Verificado correctamente",
    });
  } catch (error: any) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al verificar el código",
    });
  }
}