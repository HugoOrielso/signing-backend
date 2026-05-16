import { Router } from 'express'
import { requirePublicSession } from '../middleware/publicSession.middleware';
import { getPublicContractByToken, getPublicContractsByUser, logoutPublicSession } from '../controllers/users/user.controller';
import { requestOtp, verifyOtp } from '../controllers/otp/otp.controller';
import { getPublicContract } from '../controllers/contracts/client/getPublicContract/getPublicSingtract.controller';
import { uploadDocument } from '../middleware/uploadDocuments.moddleware';
import { uploadContractUserDocument } from '../controllers/users/uploads.controller';
import { UserGetContractDocuments } from '../controllers/users/getDocument.controller';
import { signPublicContract } from '../controllers/contracts/client/SignPublicContract/signPublicContract.controller';
// import { signPublicPagare } from '../controllers/contracts/client/signPagare/signPagare.controller';
import { getPagareStatusByToken } from '../controllers/contracts/client/getPagare/getPagareByToken.controller';
import { signPagare } from '../controllers/contracts/client/signPagare/signPagare.controller';
import { startIdentityVerification } from '../controllers/veriff/veriff.controller';
import { getConformityReceipt, signConformityReceipt } from '../controllers/contracts/client/conformityReceipt/conformity.controller';
import { getLetraCambio } from '../controllers/contracts/client/getLetraDeCambio/getLetraDeCambio.controller';
import { signLetraCambio } from '../controllers/contracts/client/signLetraDeCambio/signLetraDeCambio.controller';

const userRouter = Router()

userRouter.post("/verify/logout", requirePublicSession, logoutPublicSession);
userRouter.post("/verify/request-otp", requestOtp);
userRouter.post("/verify/verify-otp", verifyOtp);
userRouter.get("/contract/:token", requirePublicSession, getPublicContract);
userRouter.get("/contracts", requirePublicSession, getPublicContractsByUser);
userRouter.get("/contracts/:token", requirePublicSession, getPublicContractByToken);
userRouter.post("/contracts/:token/upload-document", requirePublicSession, uploadDocument.single("file"), uploadContractUserDocument);
userRouter.get("/contracts/:token/documents", requirePublicSession, UserGetContractDocuments);
userRouter.get("/contracts/:token/generateVeriffSession", requirePublicSession, startIdentityVerification);
userRouter.post("/contracts/:token/sign", requirePublicSession, signPublicContract);
userRouter.get("/contracts/pagare/:token", requirePublicSession, getPagareStatusByToken);
userRouter.post("/contracts/pagare/:token/sign", requirePublicSession, signPagare);
userRouter.post("/contracts/:token/sign-conformity-receipt", requirePublicSession, signConformityReceipt);
userRouter.get("/contracts/:token/conformity-receipt", requirePublicSession, getConformityReceipt);
userRouter.get("/contracts/:token/letra-cambio", requirePublicSession, getLetraCambio);
userRouter.post("/contracts/:token/sign-letra-cambio", requirePublicSession, signLetraCambio);


export default userRouter