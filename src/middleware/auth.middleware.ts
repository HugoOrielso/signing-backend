import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types/types";

type JwtPayload = {
  id: string;
  email: string;
  role: string
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Token no proporcionado",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;
    const userId = decoded.id

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Token inválido",
      });
    }

    req.user = {
      id: userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "No autorizado",
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    next();
  };
}