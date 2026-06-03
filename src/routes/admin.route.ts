import { Router } from "express";
import {  requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { getOperators } from "../controllers/contracts/admin/getOperators/operator.controller";
import { AdminRole } from "../generated/prisma/enums";
import { getAdminFinancialSummary } from "../controllers/contracts/admin/financialSummary/financialSummary.controller";
import { getAdminFilteredOperationalReport } from "../controllers/contracts/admin/operationalSummary/operationalSummary.controller";
import { getAnalysts } from "../controllers/contracts/admin/getAnalysts/analysts.controller";
import { createProductController, getProductsController, toggleProductStatusController, updateProductController } from "../controllers/products/getProducts.controller";

const adminRouter = Router();

adminRouter.get("/operators", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.CREDIT_ANALYST), getOperators);
adminRouter.get("/analysts", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.CREDIT_ANALYST), getAnalysts);
adminRouter.get("/contracts/financial-summary", requireAdminAuth, requireRole(AdminRole.ADMIN), getAdminFinancialSummary);
adminRouter.get("/operational-summary", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.CREDIT_ANALYST), getAdminFilteredOperationalReport);

adminRouter.get(
    "/products", 
    requireAdminAuth,
    requireRole(AdminRole.ADMIN), 
    getProductsController
);

adminRouter.post(
    "/products", 
    requireAdminAuth,
    requireRole(AdminRole.ADMIN), 
    createProductController
);

adminRouter.put(
    "/products/:id", 
    requireAdminAuth,
    requireRole(AdminRole.ADMIN), 
    updateProductController
);

adminRouter.patch(
    "/products/:id/toggle-status", 
    requireAdminAuth,
    requireRole(AdminRole.ADMIN), 
    toggleProductStatusController
);


export default adminRouter;