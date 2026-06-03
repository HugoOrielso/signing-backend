// src/services/products-catalog.service.ts

import { prisma } from "../../database/db";
import { ProductStatus } from "../../generated/prisma/enums";


export async function getActiveProductCatalog() {
  const products = await prisma.productCatalog.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      code: "asc",
    },
    include: {
      prices: {
        where: {
          isActive: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    prices: product.prices.map((price) => ({
      id: price.id,
      amount: price.amount,
      label: price.label,
      order: price.order,
    })),
  }));
}

// src/services/products.service.ts


type UpdateProductPayload = {
  code?: string;
  name?: string;
  description?: string | null;
  prices?: {
    id?: string;
    amount: number;
    label?: string | null;
    order?: number;
    isActive?: boolean;
  }[];
};

export async function getProductsService() {
  return prisma.productCatalog.findMany({
    orderBy: {
      code: "asc",
    },
    include: {
      prices: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}

export async function updateProductService(
  productId: string,
  payload: UpdateProductPayload
) {
  const productExists = await prisma.productCatalog.findUnique({
    where: { id: productId },
  });

  if (!productExists) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.productCatalog.update({
      where: { id: productId },
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
      },
    });

    if (payload.prices) {
      await tx.productPrice.deleteMany({
        where: {
          productId,
        },
      });

      await tx.productPrice.createMany({
        data: payload.prices.map((price, index) => ({
          productId,
          amount: Number(price.amount),
          label: price.label ?? `Precio ${index + 1}`,
          order: price.order ?? index + 1,
          isActive: price.isActive ?? true,
        })),
      });
    }

    return tx.productCatalog.findUnique({
      where: { id: product.id },
      include: {
        prices: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  });
}

export async function toggleProductStatusService(productId: string) {
  const product = await prisma.productCatalog.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const nextStatus =
    product.status === ProductStatus.ACTIVE
      ? ProductStatus.INACTIVE
      : ProductStatus.ACTIVE;

  return prisma.productCatalog.update({
    where: { id: productId },
    data: {
      status: nextStatus,
    },
    include: {
      prices: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}


// src/services/products.service.ts

type CreateProductPayload = {
  code: string;
  name: string;
  description?: string | null;
  prices: {
    amount: number;
    label?: string | null;
    order?: number;
    isActive?: boolean;
  }[];
};

export async function createProductService(payload: CreateProductPayload) {
  const code = payload.code.trim().toUpperCase();

  const productExists = await prisma.productCatalog.findUnique({
    where: { code },
  });

  if (productExists) {
    throw new Error("PRODUCT_CODE_EXISTS");
  }

  if (!payload.prices?.length) {
    throw new Error("PRODUCT_PRICES_REQUIRED");
  }

  return prisma.productCatalog.create({
    data: {
      code,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      prices: {
        create: payload.prices.map((price, index) => ({
          amount: Number(price.amount),
          label: price.label?.trim() || `Precio ${index + 1}`,
          order: price.order ?? index + 1,
          isActive: price.isActive ?? true,
        })),
      },
    },
    include: {
      prices: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}