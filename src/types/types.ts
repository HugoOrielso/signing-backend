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

export interface AuthenticatedPublicRequest extends Request {
  publicSession?: {
    id: string;
    email: string | null;
    phone: string | null;
    identifier: string;
    identifierType: string;
    expiresAt: Date;
  };
}


export type AdminRole = "ADMIN" | "OPERATOR" | "CREDIT_ANALYST" | "SUPERVISOR";

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: Exclude<AdminRole, "ADMIN">;
}