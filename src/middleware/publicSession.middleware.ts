import { Response, NextFunction } from "express";
import { prisma } from "../database/db";
import { AuthenticatedPublicRequest } from "../types/types";
import type { CookieOptions } from "express";

export async function requirePublicSession(
  req: AuthenticatedPublicRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionToken = req.cookies?.public_contract_session as
      | string
      | undefined;

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };

    if (!sessionToken) {
      return res.status(401).json({
        ok: false,
        code: "PUBLIC_SESSION_INVALID",
        message: "Sesión pública no válida"
      });
    }

    const session = await prisma.publicContractSession.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        email: true,
        phone: true,
        identifier: true,
        identifierType: true,
        expiresAt: true,
      },
    });

    if (!session) {
      res.clearCookie("public_contract_session", cookieOptions);

      return res.status(401).json({
        ok: false,
        code: "PUBLIC_SESSION_NOT_FOUND",
        message: "Sesión no encontrada",
      });
    }

    if (!session.expiresAt || session.expiresAt < new Date()) {
      res.clearCookie("public_contract_session", cookieOptions);

      return res.status(401).json({
        ok: false,
        code: "PUBLIC_SESSION_INVALID",
        message: "Sesión pública no válida"
      });
    }

    req.publicSession = {
      id: session.id,
      email: session.email,
      phone: session.phone,
      identifier: session.identifier,
      identifierType: session.identifierType,
      expiresAt: session.expiresAt,
    };

    return next();
  } catch (error) {
    console.error("requirePublicSession error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}