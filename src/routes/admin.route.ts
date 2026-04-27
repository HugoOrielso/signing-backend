import { Router } from "express";
import {  requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { getOperators } from "../controllers/contracts/admin/getOperators/operator.controller";
import { AdminRole } from "../generated/prisma/enums";
import { getAdminFinancialSummary } from "../controllers/contracts/admin/financialSummary/financialSummary.controller";
import { getAdminOperationalSummary } from "../controllers/contracts/admin/operationalSummary/operationalSummary.controller";

const adminRouter = Router();

adminRouter.get("/operators", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.CREDIT_ANALYST), getOperators);
adminRouter.get("/contracts/financial-summary", requireAdminAuth, requireRole(AdminRole.ADMIN), getAdminFinancialSummary);
adminRouter.get("/contracts/operational-summary", requireAdminAuth, requireRole(AdminRole.ADMIN), getAdminOperationalSummary);

export default adminRouter;