import { Request, Response } from "express";
import { loginAdmin, logoutAdmin, refreshTokens, registerAdmin } from "../../services/auth/auth.service";
import { LoginInput, RegisterInput } from "../../schemas/auth.schemas";
import { AuthenticatedRequest } from "../../types/types";
import { createUserService } from "../../services/admin/createUser.service";
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "../../utils/cookies";
import { prisma } from "../../database/db";


export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { email, name, password, role } = req.body as {
      email: string;
      name: string;
      password: string;
      role?: "OPERATOR" | "CREDIT_ANALYST";
    };

    const user = await createUserService({
      email,
      name,
      password,
      role: role ?? "OPERATOR",
    });

    return res.status(201).json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Email already in use" ? 409 : 500;

    return res.status(status).json({ error: message });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body as LoginInput;

    const result = await loginAdmin(email, password);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      message: "Login successful",
      admin: result.admin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Invalid credentials" ? 401 : 500;

    res.status(status).json({ error: message });
  }
};

export const refresh = async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    clearAuthCookies(res);
    res.status(401).json({ error: "Refresh token is required" });
    return;
  }

  try {
    const result = await refreshTokens(refreshToken);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      message: "Tokens refreshed successfully",
      admin: result.admin,
    });
  } catch (err) {
    clearAuthCookies(res);

    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "Invalid refresh token"
        ? 401
        : message === "Refresh token expired"
          ? 401
          : 500;

    res.status(status).json({ error: message });
  }
};

const getAdminSession = async (adminId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const admin = await getAdminSession(req.user.id);

    return res.status(200).json({
      ok: true,
      admin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Admin not found" ? 404 : 500;

    return res.status(status).json({
      ok: false,
      message,
    });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await logoutAdmin(refreshToken);
    }

    clearAuthCookies(res);

    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    clearAuthCookies(res);
    res.status(500).json({ error: "Internal server error" });
  }
};