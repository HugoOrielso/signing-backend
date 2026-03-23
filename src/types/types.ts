import { type Request } from "express";

export type AuthJwtPayload = {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export type AdminRole = "ADMIN" | "OPERATOR";