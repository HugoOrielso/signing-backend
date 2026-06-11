import { Router } from "express";
import { createUser, login, logout, me, refresh } from "../controllers/auth/auth.controller";
import {  requireAdminAuth, requireRole } from "../middleware/auth.middleware";
import { deactivateUserController, getAllUsersController, getUserController, updateUserController } from "../controllers/admin/users.controller";

const authRouter = Router();

authRouter.post("/create", requireAdminAuth, requireRole("ADMIN"), createUser);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAdminAuth, me);
authRouter.get("/users", requireAdminAuth, requireRole("ADMIN"), getAllUsersController);
authRouter.get("/users/:id", requireAdminAuth, requireRole("ADMIN"), getUserController);
authRouter.patch("/users/:id", requireAdminAuth, requireRole("ADMIN"), updateUserController);
authRouter.patch("/users/:id/deactivate", requireAdminAuth, requireRole("ADMIN"), deactivateUserController);

export default authRouter;