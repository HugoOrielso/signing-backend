import type { Response } from "express";
import { AuthenticatedRequest } from "../../../../types/types";
import { prisma } from "../../../../database/db";

export async function cancelLibranza(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const { id } = req.params as { id: string };

        const libranza = await prisma.contract.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
            },
        });

        if (!libranza) {
            return res.status(404).json({
                ok: false,
                message: "Libranza no encontrada",
            });
        }

        if (libranza.status === "SIGNED") {
            return res.status(400).json({
                ok: false,
                message: "No se puede cancelar una libranza firmada",
            });
        }   

        if (libranza.status === "CANCELLED") {
            return res.status(400).json({
                ok: false,
                message: "La libranza ya está cancelada",
            });
        }

        const updatedLibranza = await prisma.contract.update({
            where: { id },
            data: {
                status: "CANCELLED",
            },
        });

        return res.status(200).json({
            ok: true,
            message: "Libranza cancelada correctamente",
            data: updatedLibranza,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            ok: false,
            message: "No se pudo cancelar la libranza",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
}