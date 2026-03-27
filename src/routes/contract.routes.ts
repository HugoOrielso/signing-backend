import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { requestOtp, verifyOtp } from "../controllers/otp/otp.controller";
import { listContracts } from "../controllers/contracts/admin/ListContracts/listContract.controller";
import { createContract } from "../controllers/contracts/admin/createContract/createContract.controller";
import { sendContract } from "../controllers/contracts/admin/sendContract/sendContract.controller";
import { downloadPublicSignedContract } from "../controllers/contracts/client/documents/download/download.controller";
import { viewContractDocument } from "../controllers/contracts/client/documents/view/view.controller";
import { uploadContractDocument } from "../controllers/contracts/client/documents/upload/upload.controller";
import { getContractDocuments } from "../controllers/contracts/client/documents/getDocuments/getDocuments.controller";
import { getPublicContract } from "../controllers/contracts/client/getPublicContract/getPublicSingtract.controller";
import { signPublicContract } from "../controllers/contracts/client/SignPublicContract/signPublicContract.controller";
import { getContractById } from "../controllers/contracts/admin/getContractById/getContractById.controller";
import { getContractAuditTrail } from "../controllers/audit/getContractAuditTrail";

const contractsRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PRIVADAS — requieren sesión de admin
// ─────────────────────────────────────────────────────────────────────────────

// Solo ADMIN puede listar todos los contratos
contractsRouter.get("/", requireAuth, requireRole("ADMIN", "OPERATOR"), listContracts);

// ADMIN y OPERATOR pueden crear y enviar contratos
contractsRouter.post("/", requireAuth, requireRole("ADMIN", "OPERATOR"), createContract);
contractsRouter.post("/:id/send", requireAuth, requireRole("ADMIN", "OPERATOR"), sendContract);
// En la sección PRIVADAS
contractsRouter.get("/:id", requireAuth, requireRole("ADMIN", "OPERATOR"), getContractById);
contractsRouter.get("/:id/audit-trail", requireAuth, requireRole("ADMIN", "OPERATOR"), getContractAuditTrail);
// ─────────────────────────────────────────────────────────────────────────────
// PÚBLICAS — acceso por token del contrato
// ─────────────────────────────────────────────────────────────────────────────
contractsRouter.get("/public/:token", getPublicContract);

contractsRouter.post("/public/:token/sign", signPublicContract);

contractsRouter.post("/public/:token/request-otp", requestOtp);
contractsRouter.post("/public/:token/verify-otp", verifyOtp);

contractsRouter.post("/public/:token/upload-document", uploadContractDocument);
contractsRouter.get("/public/:token/documents", getContractDocuments);
contractsRouter.get("/public/:token/documents/:docId/view", viewContractDocument);

contractsRouter.get("/public/:token/download", downloadPublicSignedContract);

export default contractsRouter;