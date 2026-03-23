import { Request, Response } from "express";
import { loginAdmin, logoutAdmin, refreshTokens, registerAdmin } from "../../services/auth/auth.service";
import { LoginInput, RegisterInput } from "../../schemas/auth.schemas";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body as RegisterInput;
    const admin = await registerAdmin(email, name, password);
    res.status(201).json({ admin });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Email already in use" ? 409 : 500;
    res.status(status).json({ error: message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginInput;
    const result = await loginAdmin(email, password);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Invalid credentials" ? 401 : 500;
    res.status(status).json({ error: message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token is required" });
    return;
  }

  try {
    const result = await refreshTokens(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message === "Invalid refresh token" ? 401 :
      message === "Refresh token expired" ? 401 : 500;
    res.status(status).json({ error: message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await logoutAdmin(refreshToken);
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};