import { prisma } from "../database/db";
import bcrypt from "bcrypt";
import { AdminRole } from "../generated/prisma/enums";

export async function seedAdmins() {
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "contraseña", 10);
  const defaultPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || "contraseña", 10);

  const admins = [
    {
      email: "admin@demo.com",
      name: "Admin Principal",
      password: adminPassword,
      role: "ADMIN" as AdminRole,
    },
    {
      email: "operador@demo.com",
      name: "Operador",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "analista@demo.com",
      name: "Analista de Crédito",
      password: defaultPassword,
      role: "CREDIT_ANALYST" as AdminRole,
    },
    {
      email: "jairo.villamizar@dimcultura.com",
      name: "JAIRO ALONSO VILLAMIZAR CONTRERS",
      password: defaultPassword,
      role: "CREDIT_ANALYST" as AdminRole,
    },
    {
      email: "jairo.operador@dimcultura.com",
      name: "JAIRO ALONSO VILLAMIZAR CONTRERS",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },

    // Resto: operadores
    {
      email: "jose.solis@dimcultura.com",
      name: "JOSE ANTONIO SOLIS DIAZ",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "osvaldo.martinez@dimcultura.com",
      name: "OSVALDO MARTINEZ AMDOR",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "fandy.ruiz@dimcultura.com",
      name: "FANDY EDUARDO RUIZ BLANCO",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "edwar.espinel@dimcultura.com",
      name: "EDWAR ARMANDO ESPINEL",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "carlos.barrera@dimcultura.com",
      name: "CARLOS ANDRES BARRERA AVILES",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
    {
      email: "jose.escalante@dimcultura.com",
      name: "JOSÉ ANTONIO ESCALANTE DELGADO",
      password: defaultPassword,
      role: "OPERATOR" as AdminRole,
    },
  ];

  for (const admin of admins) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {},
      create: admin,
    });
  }

  console.log("✅ Admins verificados (seed seguro)");
}