import { type Response } from "express";
import { AuthenticatedRequest } from "../../types/types";
import { deactivateUser, getAllUsers, getUserById, updateUser } from "../../services/admin/users.service";


// ─── GET /auth/users ──────────────────────────────────────────────────────────

export async function getAllUsersController(req: AuthenticatedRequest, res: Response) {
    try {
        const users = await getAllUsers();
        return res.json({ ok: true, users });
    } catch (error) {
        console.error("GET USERS ERROR", error);
        return res.status(500).json({ ok: false, error: "Error al obtener usuarios" });
    }
}

// ─── GET /auth/users/:id ──────────────────────────────────────────────────────

export async function getUserController(req: AuthenticatedRequest, res: Response) {
    try {
        const { id } = req.params as { id: string };
        const user = await getUserById(id);
        return res.json({ ok: true, user });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado";
        const status = message === "Usuario no encontrado" ? 404 : 500;
        return res.status(status).json({ ok: false, error: message });
    }
}

// ─── PATCH /auth/users/:id/deactivate ────────────────────────────────────────

export async function deactivateUserController(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const currentUserId = req.user?.id;
        const { id } = req.params as { id: string };

        if (!currentUserId) {
            return res.status(401).json({
                ok: false,
                error: "Debes tener una sesión activa",
            });
        }

        await deactivateUser(id, currentUserId);

        return res.json({
            ok: true,
            message: "Usuario desactivado correctamente",
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Error inesperado";

        const statusMap: Record<string, number> = {
            "Usuario no encontrado": 404,
            "El usuario ya está inactivo": 400,
            "No puedes desactivar tu propio usuario": 400,
            "Debe existir al menos un administrador activo": 400,
        };

        return res.status(statusMap[message] ?? 500).json({
            ok: false,
            error: message,
        });
    }
}

// ─── PATCH /auth/users/:id ────────────────────────────────────────────────────

export async function updateUserController(req: AuthenticatedRequest, res: Response) {
    try {
        const { id } = req.params as { id: string };
        const { name, email, role } = req.body as {
            name?: string;
            email?: string;
            role?: "ADMIN" | "OPERATOR" | "CREDIT_ANALYST";
        }
        if (!name && !email && !role) {
            return res.status(400).json({
                ok: false,
                error: "Se requiere al menos un campo para actualizar",
            });
        }

        const user = await updateUser(id, { name, email, role });
        return res.json({ ok: true, user });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado";
        const status =
            message === "Usuario no encontrado"
                ? 404
                : message === "El email ya está en uso"
                    ? 409
                    : 500;
        return res.status(status).json({ ok: false, error: message });
    }
}