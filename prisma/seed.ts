import { prisma } from "../src/database/db";
import bcrypt from 'bcryptjs'
import { AdminRole } from "../src/generated/prisma/enums";

async function main() {
  const password = await bcrypt.hash('contraseña', 10)

  const admins = [
    {
      email: 'admin@demo.com',
      name: 'Admin Principal',
      password,
      role: 'ADMIN' as AdminRole,
    },
    {
      email: 'operador@demo.com',
      name: 'Operador',
      password,
      role: 'OPERATOR' as AdminRole,
    },
  ]

  for (const admin of admins) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {},
      create: admin,
    })
  }

  console.log('✅ Admins creados correctamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })