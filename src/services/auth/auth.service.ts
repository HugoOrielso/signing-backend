import { prisma } from "../../database/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { AdminRole } from "../../types/types";
const ACCESS_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

const generateAccessToken = (id: string, email: string, role: AdminRole) =>
  jwt.sign({ id, email, role }, ACCESS_SECRET, { expiresIn: "15m" });

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const registerAdmin = async (
  email: string,
  name: string,
  password: string
) => {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const admin = await prisma.admin.create({
      data: { email, name, password: hashed },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return admin;
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Email already in use");
    throw err;
  }
};




export const loginAdmin = async (email: string, password: string) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new Error("Invalid credentials");

  await prisma.refreshToken.deleteMany({
    where: { adminId: admin.id },
  });

  const accessToken = generateAccessToken(admin.id, admin.email, admin.role);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      adminId: admin.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
};

export const refreshTokens = async (token: string) => {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { admin: true },
  });

  if (!stored) throw new Error("Invalid refresh token");

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token } });
    throw new Error("Refresh token expired");
  }

  await prisma.refreshToken.delete({ where: { token } });

  const newAccessToken = generateAccessToken(
    stored.admin.id,
    stored.admin.email,
    stored.admin.role
  );

  const newRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      adminId: stored.admin.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    admin: {
      id: stored.admin.id,
      email: stored.admin.email,
      name: stored.admin.name,
      role: stored.admin.role,
    },
  };
};

export const logoutAdmin = async (token?: string) => {
  if (!token) return;

  await prisma.refreshToken.deleteMany({
    where: { token },
  });
};