// src/controllers/contracts/otp.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "../../database/db";
const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;

export async function requestOtp(req: Request, res: Response) {
  try {

    const { email } = req.body as { email?: string };

    if (!email?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "El correo es requerido",
      });
    }

    const emailNorm = email.trim().toLowerCase();

    const code = String(crypto.randomInt(100000, 999999));
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.publicContractSession.deleteMany({
      where: {
        email: emailNorm,
      },
    });

    await prisma.publicContractSession.create({
      data: {
        email: emailNorm,
        otpCode: code,
        otpExpiresAt,
        otpAttempts: 0,
        sessionToken: null,
        expiresAt: null,
        verifiedAt: null,
      },
    });

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: emailNorm,
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

    return res.json({
      ok: true,
      message: "Si ese correo está registrado, recibirás un código.",
    });
  } catch (error) {
    console.error("REQUEST OTP ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al procesar la solicitud",
    });
  }
}

const PUBLIC_SESSION_TTL_MS = 1000 * 60 * 60 * 3; // 3 horas

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { code, email } = req.body as { code: string; email: string };

    if (!code?.trim() || !email?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "El código es requerido",
      });
    }


    const sessionRow = await prisma.publicContractSession.findFirst({
      where: {
        email: email,
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

    res.cookie("public_contract_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return res.json({
      ok: true,
      session: {
        id: updated.id,
        email: updated.email,
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