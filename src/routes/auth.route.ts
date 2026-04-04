import { Router } from "express";
import { createUser, login, logout, refresh } from "../controllers/auth/auth.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/create", requireAuth , requireRole("ADMIN"), createUser);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);

export default authRouter;