import { Router } from "express";
import { requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { requestOtp, verifyOtp } from "../controllers/otp/otp.controller";
import { listContracts } from "../controllers/contracts/admin/ListContracts/listContract.controller";
import { createContract } from "../controllers/contracts/admin/createContract/createContract.controller";
import { downloadPublicSignedContract } from "../controllers/contracts/client/documents/download/download.controller";
import { viewContractDocument } from "../controllers/contracts/client/documents/view/view.controller";
import { uploadContractDocument } from "../controllers/contracts/client/documents/upload/upload.controller";
import { getInfo } from "../controllers/contracts/client/documents/getInfo/getInfo.controller";
import { getPublicContract } from "../controllers/contracts/client/getPublicContract/getPublicSingtract.controller";
import { signPublicContract } from "../controllers/contracts/client/SignPublicContract/signPublicContract.controller";
import { getContractById } from "../controllers/contracts/admin/getContractById/getContractById.controller";
import { getContractAuditTrail } from "../controllers/audit/getContractAuditTrail";
import { uploadDocument } from "../middleware/uploadDocuments.moddleware";
import { getContractDocuments } from "../controllers/contracts/client/documents/getDocuments/getDocuments.controller";
import { reviewContractDocument } from "../controllers/contracts/client/documents/review/review.controller";
import { AdminRole } from "../generated/prisma/enums";
import { reviewContractUserData } from "../controllers/contracts/client/documents/verify/verify.controller";
import { getRejectedLibranza } from "../controllers/contracts/admin/review/getRejectedLibranza.controller";
import { resendRejectedLibranza } from "../controllers/contracts/admin/review/resendRejectedLibranza.controller";
import { downloadSignedContractById } from "../controllers/contracts/admin/dowloadSignedContractById/dowloadSignedContractById.controller";

const contractsRouter = Router();


// Solo ADMIN puede listar todos los contratos
contractsRouter.get("/", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.CREDIT_ANALYST), listContracts);

// ADMIN y OPERATOR pueden crear y enviar contratos
contractsRouter.post("/", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR, ), createContract);
// En la sección PRIVADAS
contractsRouter.get("/:id", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR,  AdminRole.CREDIT_ANALYST), getContractById);
contractsRouter.get("/:id/audit-trail", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR,), getContractAuditTrail);


contractsRouter.post("/public/:token/upload-document", uploadDocument.single("file"), uploadContractDocument);
contractsRouter.get("/public/:token/info", getInfo);
contractsRouter.get("/contract/:token/documents", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.CREDIT_ANALYST), getContractDocuments);
contractsRouter.get("/public/:token/documents/:docId/view", viewContractDocument);
contractsRouter.patch("/documents/:id/review", requireAdminAuth, requireRole(AdminRole.CREDIT_ANALYST), reviewContractDocument)
contractsRouter.patch("/contract/:id/review", requireAdminAuth, requireRole(AdminRole.CREDIT_ANALYST), reviewContractUserData)
contractsRouter.get("/contract/:id/getRejectedLibranza", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR), getRejectedLibranza)
contractsRouter.patch("/contract/:id/resend-libranza", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR), resendRejectedLibranza)

contractsRouter.get("/public/:token/download", downloadPublicSignedContract);
contractsRouter.get("/contract/:id/download", requireAdminAuth, requireRole(AdminRole.ADMIN, AdminRole.OPERATOR),  downloadSignedContractById);

export default contractsRouter;



