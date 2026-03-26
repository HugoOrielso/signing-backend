import { Router } from "express";
import { login, logout, refresh, register } from "../controllers/auth/auth.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/register", requireAuth , requireRole("ADMIN"), register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);

export default authRouter;