import { prisma } from "../../database/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const SALT_ROUNDS = 10;

const generateAccessToken = (id: string, email: string) =>
  jwt.sign({ id, email }, ACCESS_SECRET, { expiresIn: "1h" });

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

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

  const accessToken = generateAccessToken(admin.id, admin.email);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      adminId: admin.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
    },
  });

  return {
    accessToken,
    refreshToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
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

  // Rotate: borra el viejo y crea uno nuevo
  await prisma.refreshToken.delete({ where: { token } });

  const newAccessToken = generateAccessToken(stored.admin.id, stored.admin.email);
  const newRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      adminId: stored.admin.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    admin: {
      id: stored.admin.id,
      email: stored.admin.email,
      name: stored.admin.name,
    },
  };
};

export const logoutAdmin = async (token: string) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};