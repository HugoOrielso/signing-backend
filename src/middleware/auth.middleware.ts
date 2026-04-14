import type { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../types/types";
import { verifyAccessToken } from "../utils/cookies";

const isProduction = process.env.NODE_ENV === "production";

const ADMIN_ACCESS_COOKIE_NAME = isProduction
  ? "__Secure-admin_accessToken"
  : "admin_accessToken";

export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[ADMIN_ACCESS_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          message: "Token expirado",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          ok: false,
          message: "Token inválido",
        });
      }
    }

    return res.status(401).json({
      ok: false,
      message: "No autenticado",
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a este recurso",
      });
    }

    next();
  };
}