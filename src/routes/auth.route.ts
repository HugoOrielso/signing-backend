import { Router } from "express";
import { createUser, login, logout, me, refresh } from "../controllers/auth/auth.controller";
import {  requireAdminAuth, requireRole } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/create", requireAdminAuth, requireRole("ADMIN"), createUser);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAdminAuth, me);

export default authRouter;