import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function getOperators(req: AuthenticatedRequest, res: Response) {
    try {

        const operators = await prisma.admin.findMany({
            where: { role: "OPERATOR" },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (!operators) {
            return res.status(204).json({ ok: false, message: "No se encontraron operadores" });
        }

        return res.json({ ok: true, data: operators });
    } catch (error: any) {
        return res
            .status(500)
            .json({ ok: false, message: "No se pudieron obtener los operadores" });
    }
}