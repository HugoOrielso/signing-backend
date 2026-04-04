import { prisma } from "../../database/db";
import bcrypt from "bcrypt";
type InternalUserRole = "OPERATOR" | "CREDIT_ANALYST";

interface CreateUserServiceInput {
  email: string;
  name: string;
  password: string;
  role: InternalUserRole;
}

export async function createUserService({
  email,
  name,
  password,
  role,
}: CreateUserServiceInput) {
  const existing = await prisma.admin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    throw new Error("Email already in use");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.admin.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}