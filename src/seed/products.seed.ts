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
    {
      code: "DOC0189",
      name: "GRAFIKIDS MAYUSCULAS CURSIVAS",
      prices: [65000],
    },
    {
      code: "DOC0190",
      name: "GRAFIKIDS LINEAS CURSIVAS",
      prices: [65000],
    },
    {
      code: "DOC0191",
      name: "GRAFIKIDS ORTOGRAFIA",
      prices: [65000],
    },
    {
      code: "DOC0192",
      name: "GRAFIKIDS SUMA Y RESTA",
      prices: [65000],
    },
    {
      code: "DOC0194",
      name: "GRAFIKIDS NUMEROS",
      prices: [65000],
    },
    {
      code: "DOC0195",
      name: "GRAFIKIDS MINUSCULAS CURSIVA",
      prices: [65000],
    },
    {
      code: "DOC0196",
      name: "GRAFIKIDS MINUSCULA IMPRENTA",
      prices: [65000],
    },
    {
      code: "ENC0001",
      name: "CURSO ORIENTACION DIDAC 7TM +CD",
      prices: [350000],
    },
    {
      code: "ENC0070",
      name: "NUEVA ENC TEMATICA ESTUDIANTIL 4T+1CD",
      prices: [350000],
    },
    {
      code: "INA0021",
      name: "EASY ENGLISH BEGNNER BASIC+2CD+1DVD",
      prices: [180000],
    },
    {
      code: "INS0023",
      name: "MANUAL DE WINDOWS 7 1T+1CD",
      prices: [150000],
    },
    {
      code: "MED0060",
      name: "MANUAL DE RADIOLOGIA MAXILOFACIAL 1T",
      prices: [250000],
    },
    {
      code: "MED0073",
      name: "ODONTOLOGIA PARA LA HIGIENE ORAL",
      prices: [150000],
    },
    {
      code: "MED0109",
      name: "MN BASICO DE ENDODONCIA 1TM +CD ZAMORA",
      prices: [150000],
    },
    {
      code: "MED0135",
      name: "MECANICA DENTAL",
      prices: [350000],
    },
    {
      code: "MNH0020",
      name: "CORTES Y PEINADOS PASA A PASO",
      prices: [250000],
    },
    {
      code: "MNH0030",
      name: "NUEVAS TENDENCIAS PELUQUERIA ACTUAL",
      prices: [250000],
    },
    {
      code: "MNH0074",
      name: "THE BRIDES BOOK 10 TM",
      prices: [250000],
    },
    {
      code: "OBT0088",
      name: "MANUAL GANADERO ACTUALIZADO 1T+1CD",
      prices: [450000],
    },
    {
      code: "OBT0144",
      name: "BIBLIA DE LOS MATERIALES DE CONSTRUCCION LEXUS",
      prices: [350000],
    },
    {
      code: "REL0053",
      name: "HISTORIAS DE LA BIBLIA PARA PINTAR TOMO 01",
      prices: [65000],
    },
    {
      code: "REL0054",
      name: "HISTORIAS DE LA BIBLIA PARA PINTAR TOMO 02",
      prices: [65000],
    },
    {
      code: "REL0055",
      name: "HISTORIAS DE LA BIBLIA PARA PINTAR TOMO 03",
      prices: [65000],
    },
    {
      code: "VP003",
      name: "LOS DEBERES DEL NIÑO EN EL HOGAR",
      prices: [20000, 45000],
    },
    {
      code: "VP004",
      name: "LOS DERECHOS DEL NIÑO EN EL HOGAR",
      prices: [20000, 45000],
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