// routes/staff.routes.ts
import { Router } from "express";
import { requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { AdminRole } from "../generated/prisma/enums";
import { getMyFinancialSummary } from "../controllers/operator/financial-report/financial-report.controller";

const staffRouter = Router();

staffRouter.get(
  "/financial-report",
  requireAdminAuth,
  requireRole(AdminRole.OPERATOR, AdminRole.CREDIT_ANALYST),
  getMyFinancialSummary
);

export default staffRouter;