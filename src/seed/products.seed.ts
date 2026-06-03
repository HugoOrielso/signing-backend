// seeds/products.seed.ts

import { prisma } from "../database/db";

export async function seedProducts() {
  const products = [
    {
      code: "VD001",
      name: "COLECCIÓN VIRTUAL DE VALORES EN FAMILIA",
      prices: [1000000, 1250000, 1350000],
    },
    {
      code: "VD002",
      name: "COLECCIÓN OBRAS MAESTRAS DEL RELATO BREVE",
      prices: [1000000, 1250000, 1350000],
    },
    {
      code: "VD003",
      name: "COLECCIÓN VIDAS Y OBRAS DE LOS SANTOS CATÓLICOS",
      prices: [1000000, 1250000, 1350000],
    },
    {
      code: "VD004",
      name: "COLECCIÓN LOS BEBES GENIALES",
      prices: [1000000, 1250000, 1350000],
    },
    {
      code: "VD005",
      name: "COLECCIÓN DE DIBUJO Y PINTURA",
      prices: [700000, 800000, 900000],
    },
    {
      code: "VD006",
      name: "COLECCIÓN PRESIDENTES DE COLOMBIA",
      prices: [400000, 500000, 600000],
    },
    {
      code: "VG001",
      name: "CURSO VIRTUAL MULTILINGÜISMO PARA NIÑOS",
      prices: [500000, 600000, 792000],
    },
    {
      code: "VG002",
      name: "MIS PRIMERAS PALABRAS",
      prices: [462000, 490000, 550000],
    },
    {
      code: "VG003",
      name: "CONSTRUYENDO EL SISTEMA SOLAR",
      prices: [190000, 250000, 350000],
    },
    {
      code: "VG004",
      name: "EL PRINCIPITO EL NIÑO SOÑADOR",
      prices: [220000, 320000, 370000],
    },
    {
      code: "VG005",
      name: "COLECCIÓN HISTORIA LAS SIETE MARAVILLAS DEL MUNDO",
      prices: [264000, 528000, 594000],
    },
  ];

  for (const item of products) {
    const product = await prisma.productCatalog.upsert({
      where: {
        code: item.code,
      },
      update: {
        name: item.name,
      },
      create: {
        code: item.code,
        name: item.name,
      },
    });

    await prisma.productPrice.deleteMany({
      where: {
        productId: product.id,
      },
    });

    await prisma.productPrice.createMany({
      data: item.prices.map((amount, index) => ({
        productId: product.id,
        amount,
        order: index + 1,
        label: `Precio ${index + 1}`,
      })),
    });
  }

  console.log("✅ Productos verificados (seed seguro)");
}