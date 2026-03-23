import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

// Controllers privados (admin autenticado)
import { createContract, downloadPublicSignedContract, getContractById, listContracts, sendContract } from "../controllers/contracts/contracts.controller";

// Controllers públicos (cliente con token)
import { getPublicContract, signPublicContract } from "../controllers/contracts/contracts.controller";
import { requestOtp, verifyOtp } from "../controllers/otp/otp.controller";
import { getContractDocuments, uploadContractDocument, viewContractDocument } from "../controllers/upload/upload.controller";

const contractsRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PRIVADAS — requieren sesión de admin
// ─────────────────────────────────────────────────────────────────────────────

// Solo ADMIN puede listar todos los contratos
contractsRouter.get("/", requireAuth, requireRole("ADMIN"), listContracts);

// ADMIN y OPERATOR pueden crear y enviar contratos
contractsRouter.post("/", requireAuth, requireRole("ADMIN", "OPERATOR"), createContract);
contractsRouter.post("/:id/send", requireAuth, requireRole("ADMIN", "OPERATOR"), sendContract);
// En la sección PRIVADAS
contractsRouter.get("/:id", requireAuth, requireRole("ADMIN", "OPERATOR"), getContractById);
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