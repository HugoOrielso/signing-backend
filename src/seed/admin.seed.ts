import { prisma } from "../database/db";
import bcrypt from "bcrypt";
import { AdminRole } from "../generated/prisma/enums";

export async function seedAdmins() {
  const password = await bcrypt.hash("contraseña", 10);

  const admins = [
    {
      email: "admin@demo.com",
      name: "Admin Principal",
      password,
      role: "ADMIN" as AdminRole,
    },
    {
      email: "operador@demo.com",
      name: "Operador",
      password,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "analista@demo.com",
      name: "Analista de Crédito",
      password,
      role: "CREDIT_ANALYST" as AdminRole,
    },
    {
      email: "jairo.analista@dimcultura.com",
      name: "Jairo",
      password,
      role: "CREDIT_ANALYST" as AdminRole,
    },
    {
      email: "jairo.operador@dimcultura.com",
      name: "Jairo",
      password,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "armando.analista@dimcultura.com",
      name: "Armando",
      password,
      role: "CREDIT_ANALYST" as AdminRole,
    },
    {
      email: "armando.operador@dimcultura.com",
      name: "Armando",
      password,
      role: "OPERATOR" as AdminRole,
    },
  ];

  for (const admin of admins) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {}, // 👈 no modifica si existe
      create: admin,
    });
  }

  console.log("✅ Admins verificados (seed seguro)");
}