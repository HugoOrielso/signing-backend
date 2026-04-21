// src/controllers/contracts/otp.controller.ts
import { CookieOptions, Request, Response } from "express";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "../../database/db";
import { sendSms, toTwilioColombianPhone } from "../../services/messages/send.service";

const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const PUBLIC_SESSION_TTL_MS = 1000 * 60 * 60 * 3; // 3 horas

type IdentifierType = "EMAIL" | "PHONE";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");

  // si llega 3001234567 => 573001234567
  if (digits.length === 10) {
    digits = `${digits}`;
  }

  return digits;
}

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function resolveIdentifier(rawValue: string): {
  identifier: string;
  identifierType: IdentifierType;
  email: string | null;
  phone: string | null;
} | null {
  const value = rawValue.trim();

  if (isEmail(value)) {
    const email = value.toLowerCase();

    return {
      identifier: email,
      identifierType: "EMAIL",
      email,
      phone: null,
    };
  }

  if (isPhone(value)) {
    const phone = normalizePhone(value);

    return {
      identifier: phone,
      identifierType: "PHONE",
      email: null,
      phone,
    };
  }

  return null;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  const visibleName =
    name.length <= 2
      ? `${name[0]}*`
      : `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 1))}`;

  return `${visibleName}@${domain}`;
}

function maskPhone(phone: string) {
  const visible = phone.slice(-4);
  return `***${visible}`;
}

export async function requestOtp(req: Request, res: Response) {
  try {
    const { identifier } = req.body as { identifier?: string };
    if (!identifier?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "El correo o teléfono es requerido",
      });
    }

    const resolved = resolveIdentifier(identifier);

    if (!resolved) {
      return res.status(400).json({
        ok: false,
        message: "Debes ingresar un correo o teléfono válido",
      });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.publicContractSession.deleteMany({
      where: {
        identifier: resolved.identifier,
      },
    });

    await prisma.publicContractSession.create({
      data: {
        identifier: resolved.identifier,
        identifierType: resolved.identifierType,
        email: resolved.email,
        phone: resolved.phone,
        otpCode: code,
        otpExpiresAt,
        otpAttempts: 0,
        sessionToken: null,
        expiresAt: null,
        verifiedAt: null,
      },
    });

    if (resolved.identifierType === "EMAIL" && resolved.email) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: resolved.email,
        subject: "Tu código de acceso — Dimcultura S.A.S",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                Acceso seguro a tu contrato
              </p>
            </div>
            <div style="padding:32px;">
              <p style="font-size:14px;line-height:1.6;color:#4b5563;">
                Usa este código para verificar tu identidad. Expira en <strong>10 minutos</strong>.
              </p>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:24px;text-align:center;margin:24px 0;">
                <p style="margin:0;font-size:38px;font-weight:800;letter-spacing:10px;color:#1e3a8a;font-family:monospace;">
                  ${code}
                </p>
              </div>
            </div>
          </div>
        `,
      });
    }

    if (resolved.identifierType === "PHONE" && resolved.phone) {
      const phoneForTwilio = toTwilioColombianPhone(resolved.identifier);
      
      if (!phoneForTwilio) {
        return res.status(400).json({
          ok: false,
          message: "Número de teléfono inválido",
        });
      }
      await sendSms(phoneForTwilio, `Tu código de acceso es: ${code}. Expira en 10 minutos.`)
    }

    return res.json({
      ok: true,
      channel: resolved.identifierType,
      maskedDestination:
        resolved.identifierType === "EMAIL" && resolved.email
          ? maskEmail(resolved.email)
          : resolved.phone
          ? maskPhone(resolved.phone)
          : null,
      message: "Si el dato está registrado, recibirás un código.",
    });
  } catch (error) {
    console.error("REQUEST OTP ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al procesar la solicitud",
    });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { code, identifier } = req.body as {
      code?: string;
      identifier?: string;
    };

    if (!code?.trim() || !identifier?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "El código y el correo o teléfono son requeridos",
      });
    }

    const resolved = resolveIdentifier(identifier);

    if (!resolved) {
      return res.status(400).json({
        ok: false,
        message: "Debes ingresar un correo o teléfono válido",
      });
    }

    const sessionRow = await prisma.publicContractSession.findFirst({
      where: {
        identifier: resolved.identifier,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!sessionRow || !sessionRow.otpCode || !sessionRow.otpExpiresAt) {
      return res.status(400).json({
        ok: false,
        message: "Código inválido o expirado. Solicita uno nuevo.",
      });
    }

    if (new Date() > sessionRow.otpExpiresAt) {
      await prisma.publicContractSession.delete({
        where: { id: sessionRow.id },
      });

      return res.status(400).json({
        ok: false,
        message: "El código ha expirado. Solicita uno nuevo.",
      });
    }

    if (sessionRow.otpAttempts >= MAX_ATTEMPTS) {
      await prisma.publicContractSession.delete({
        where: { id: sessionRow.id },
      });

      return res.status(429).json({
        ok: false,
        message: "Demasiados intentos. Solicita un nuevo código.",
      });
    }

    if (sessionRow.otpCode !== code.trim()) {
      const attempts = sessionRow.otpAttempts + 1;

      await prisma.publicContractSession.update({
        where: { id: sessionRow.id },
        data: {
          otpAttempts: attempts,
        },
      });

      const left = MAX_ATTEMPTS - attempts;

      return res.status(400).json({
        ok: false,
        message: `Código incorrecto. ${left} intento${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}.`,
      });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PUBLIC_SESSION_TTL_MS);

    const updated = await prisma.publicContractSession.update({
      where: { id: sessionRow.id },
      data: {
        sessionToken,
        expiresAt,
        verifiedAt: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      expires: expiresAt,
      path: "/",
    };

    res.cookie("public_contract_session", sessionToken, cookieOptions);

    return res.json({
      ok: true,
      session: {
        id: updated.id,
        identifier: updated.identifier,
        identifierType: updated.identifierType,
        email: updated.email,
        phone: updated.phone,
        sessionToken: updated.sessionToken,
        expiresAt: updated.expiresAt,
      },
      message: "Verificado correctamente",
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al verificar el código",
    });
  }
}