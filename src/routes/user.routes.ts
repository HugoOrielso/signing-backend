import { Router } from 'express'
import { requirePublicSession } from '../middleware/publicSession.middleware';
import { getPublicContractByToken, getPublicContractsByUser, logoutPublicSession } from '../controllers/users/user.controller';
import { requestOtp, verifyOtp } from '../controllers/otp/otp.controller';
import { getPublicContract } from '../controllers/contracts/client/getPublicContract/getPublicSingtract.controller';
import { uploadDocument } from '../middleware/uploadDocuments.moddleware';
import { uploadContractUserDocument } from '../controllers/users/uploads.controller';
import { UserGetContractDocuments } from '../controllers/users/getDocument.controller';
import { signPublicContract } from '../controllers/contracts/client/SignPublicContract/signPublicContract.controller';

const userRouter = Router()

userRouter.post("/verify/:token/logout", requirePublicSession, logoutPublicSession);
userRouter.post("/verify/request-otp", requestOtp);
userRouter.post("/verify/verify-otp", verifyOtp);
userRouter.get("/contract/:token", requirePublicSession, getPublicContract);
userRouter.get("/contracts", requirePublicSession, getPublicContractsByUser);
userRouter.get("/contracts/:token", requirePublicSession, getPublicContractByToken);
userRouter.post("/contracts/:token/upload-document", requirePublicSession, uploadDocument.single("file"), uploadContractUserDocument);
userRouter.get("/contracts/:token/documents",  requirePublicSession, UserGetContractDocuments);
userRouter.post("/contracts/:token/sign", requirePublicSession, signPublicContract);


export default userRouter