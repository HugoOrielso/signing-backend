// src/routes/contracts.router.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";

// Controllers privados (admin autenticado)
import { createContract, downloadPublicSignedContract, listContracts, sendContract } from "../controllers/contracts/contracts.controller";

// Controllers públicos (cliente con token)
import { getPublicContract, signPublicContract } from "../controllers/contracts/contracts.controller";
import { requestOtp, verifyOtp } from "../controllers/otp/otp.controller";
import { getContractDocuments, uploadContractDocument, viewContractDocument } from "../controllers/upload/upload.controller";

const contractsRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PRIVADAS — requieren sesión de admin
// ─────────────────────────────────────────────────────────────────────────────
contractsRouter.post("/", requireAuth, createContract);
contractsRouter.post("/:id/send", requireAuth, sendContract);
contractsRouter.get("/", requireAuth, listContracts);   // GET /contracts

// ─────────────────────────────────────────────────────────────────────────────
// PÚBLICAS — acceso por token del contrato
// ─────────────────────────────────────────────────────────────────────────────

// Ver contrato
contractsRouter.get("/public/:token", getPublicContract);

// Firmar
contractsRouter.post("/public/:token/sign", signPublicContract);

// OTP — verificación de identidad del cliente
contractsRouter.post("/public/:token/request-otp", requestOtp);
contractsRouter.post("/public/:token/verify-otp", verifyOtp);

// Documentos adjuntos (cédula, selfie, PDF, etc.)
contractsRouter.post("/public/:token/upload-document", uploadContractDocument);
contractsRouter.get("/public/:token/documents", getContractDocuments);
contractsRouter.get("/public/:token/documents/:docId/view", viewContractDocument);

// Descargar PDF firmado
contractsRouter.get("/public/:token/download", downloadPublicSignedContract);

export default contractsRouter;