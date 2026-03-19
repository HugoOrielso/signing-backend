import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types/types";

type JwtPayload = {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("AUTH MIDDLEWARE FILE LOADED");
    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER", authHeader);
    console.log("aquiii");
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

    const userId = decoded.id || decoded.sub;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Token inválido",
      });
    }

    req.user = {
      id: userId,
      email: decoded.email,
      role: decoded.role,
    };

    console.log("AUTH USER", req.user);

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR", error);
    return res.status(401).json({
      ok: false,
      message: "No autorizado",
    });
  }
}