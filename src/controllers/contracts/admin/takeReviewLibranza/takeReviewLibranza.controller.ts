import type { Response } from "express";
import { AuthenticatedRequest } from "../../../../types/types";
import { prisma } from "../../../../database/db";

export async function takeLibranza(req: AuthenticatedRequest, res: Response) {
    try {
        const adminId = req.user?.id;
        const adminRole = req.user?.role;

        if (!adminId) {
            return res.status(401).json({ ok: false, message: "Usuario no autenticado" });
        }

        // Solo analistas y admins pueden tomar
        if (adminRole !== "CREDIT_ANALYST" && adminRole !== "ADMIN") {
            return res.status(403).json({ ok: false, message: "No tienes permisos para tomar libranzas" });
        }

        const { id } = req.params as { id: string };

        const contract = await prisma.contract.findUnique({
            where: { id },
            select: { id: true, status: true, assignedToId: true },
        });

        if (!contract) {
            return res.status(404).json({ ok: false, message: "Libranza no encontrada" });
        }

        if (contract.status === "SIGNED") {
            return res.status(400).json({ ok: false, message: "No se puede tomar una libranza firmada" });
        }

        if (contract.status === "CANCELLED") {
            return res.status(400).json({ ok: false, message: "No se puede tomar una libranza anulada" });
        }

        if (contract.assignedToId && contract.assignedToId !== adminId) {
            return res.status(409).json({ ok: false, message: "Esta libranza ya fue tomada por otro analista" });
        }

        const updated = await prisma.contract.update({
            where: { id },
            data: {
                assignedToId: adminId,
                assignedAt: new Date(),
            },
            select: {
                id: true,
                status: true,
                assignedAt: true,
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return res.status(200).json({
            ok: true,
            message: "Libranza tomada correctamente",
            data: updated,
        });

    } catch (error: unknown) {
        return res.status(500).json({
            ok: false,
            message: "No se pudo tomar la libranza",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
}