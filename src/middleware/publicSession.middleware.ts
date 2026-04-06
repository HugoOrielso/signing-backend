import { Response, NextFunction } from "express";
import { prisma } from "../database/db";
import { AuthenticatedPublicRequest } from "../types/types";

export async function requirePublicSession(
  req: AuthenticatedPublicRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionToken = req.cookies?.public_contract_session as
      | string
      | undefined;

    if (!sessionToken) {
      return res.status(401).json({
        ok: false,
        message: "Sesión pública no válida",
      });
    }

    const session = await prisma.publicContractSession.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        email: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return res.status(401).json({
        ok: false,
        message: "Sesión no encontrada",
      });
    }

    if (!session.expiresAt || session.expiresAt < new Date()) {
      return res.status(401).json({
        ok: false,
        message: "La sesión ha expirado",
      });
    }

    req.publicSession = {
      id: session.id,
      email: session.email,
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