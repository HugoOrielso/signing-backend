// routes/staff.routes.ts
import { Router } from "express";
import { requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { AdminRole } from "../generated/prisma/enums";
import { getMyFinancialSummary } from "../controllers/operator/financial-report/financial-report.controller";
import { getProductsCatalogController, getProductsController, toggleProductStatusController, updateProductController } from "../controllers/products/getProducts.controller";

const productsRouter = Router();

productsRouter.get(
    "/",
    requireAdminAuth,
    requireRole(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.CREDIT_ANALYST),
    getProductsCatalogController
);

export default productsRouter;