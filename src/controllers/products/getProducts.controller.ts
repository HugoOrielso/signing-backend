// src/controllers/products-catalog.controller.ts

import {type Response } from "express";
import { AuthenticatedRequest } from "../../types/types";
import { createProductService, getActiveProductCatalog, getProductsService, toggleProductStatusService, updateProductService } from "../../services/products/products.service";

export async function getProductsCatalogController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const products = await getActiveProductCatalog();

    return res.status(200).json({
      ok: true,
      products,
    });
  } catch (error) {
    console.error("Error al obtener catálogo de productos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener catálogo de productos",
    });
  }
}


// src/controllers/products.controller.ts

export async function getProductsController(req: AuthenticatedRequest, res: Response) {
  try {
    const products = await getProductsService();

    return res.status(200).json({
      ok: true,
      products,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener productos",
    });
  }
}

export async function updateProductController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const product = await updateProductService(id, req.body);

    return res.status(200).json({
      ok: true,
      message: "Producto actualizado correctamente",
      product,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);

    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al actualizar producto",
    });
  }
}

export async function toggleProductStatusController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { id } = req.params as { id: string };

    const product = await toggleProductStatusService(id);

    return res.status(200).json({
      ok: true,
      message:
        product.status === "ACTIVE"
          ? "Producto activado correctamente"
          : "Producto desactivado correctamente",
      product,
    });
  } catch (error) {
    console.error("Error al cambiar estado del producto:", error);

    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al cambiar estado del producto",
    });
  }
}


export async function createProductController(req: AuthenticatedRequest, res: Response) {
  try {
    const product = await createProductService(req.body);

    return res.status(201).json({
      ok: true,
      message: "Producto creado correctamente",
      product,
    });
  } catch (error) {
    console.error("Error al crear producto:", error);

    if (error instanceof Error && error.message === "PRODUCT_CODE_EXISTS") {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un producto con ese código",
      });
    }

    if (error instanceof Error && error.message === "PRODUCT_PRICES_REQUIRED") {
      return res.status(400).json({
        ok: false,
        message: "Debes agregar al menos un precio",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al crear producto",
    });
  }
}