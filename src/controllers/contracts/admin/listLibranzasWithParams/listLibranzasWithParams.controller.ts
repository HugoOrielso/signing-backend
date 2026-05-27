import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function listContractsWithParams(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const adminId = req.user?.id;
        const role = req.user?.role;

        if (!adminId) {
            return res.status(401).json({
                ok: false,
                message: "No autenticado",
            });
        }

        const { asesor, startDate, endDate, status, search } = req.query;

        const where: any = {
            status: {
                not: "CANCELLED",
            },
        };

        // ✅ FILTROS OPCIONALES

        // 📅 Fecha
        if (startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return res.status(400).json({
                    ok: false,
                    message: "Rango de fechas inválido",
                });
            }

            end.setHours(23, 59, 59, 999);

            where.createdAt = {
                gte: start,
                lte: end,
            };
        }

        // 👤 Asesor
        if (asesor && asesor !== "ALL") {
            where.libranzaData = {
                is: {
                    asesor: String(asesor),
                },
            };
        }

        // 📊 Status adicional (sin romper exclusión)
        if (status && status !== "ALL") {
            where.status = {
                equals: status, // 👈 filtra solo ese
            };
        }

        // 🔐 Roles
        if (role !== "ADMIN" && role !== "CREDIT_ANALYST") {
            where.adminId = adminId;
        }

        if (role === "CREDIT_ANALYST") {
            where.OR = [
                { assignedToId: adminId },
                { assignedToId: null },
            ];
        }

        // 🔍 Search
        if (search) {
            const q = String(search).trim();

            where.AND = [
                ...(where.AND ?? []),
                {
                    OR: [
                        { contractNumber: { contains: q, mode: "insensitive" } },
                        { title: { contains: q, mode: "insensitive" } },
                        {
                            libranzaData: {
                                is: {
                                    OR: [
                                        { clienteNombre: { contains: q, mode: "insensitive" } },
                                        { clienteCC: { contains: q, mode: "insensitive" } },
                                        { clienteTelefono: { contains: q, mode: "insensitive" } },
                                        { clienteEmail: { contains: q, mode: "insensitive" } },
                                        { empresaTrabajo: { contains: q, mode: "insensitive" } },
                                    ],
                                },
                            },
                        },
                        {
                            parties: {
                                some: {
                                    OR: [
                                        { name: { contains: q, mode: "insensitive" } },
                                        { identification: { contains: q, mode: "insensitive" } },
                                        { phone: { contains: q, mode: "insensitive" } },
                                        { email: { contains: q, mode: "insensitive" } },
                                    ],
                                },
                            },
                        },
                    ],
                },
            ];
        }

        const contracts = await prisma.contract.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                parties: true,
                libranzaData: true,
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                signers: {
                    orderBy: { signerOrder: "asc" },
                },
                signatures: {
                    select: {
                        id: true,
                        signerId: true,
                        type: true,
                        typedValue: true,
                        signedAt: true,
                    },
                },
            },
        });

        return res.json({
            ok: true,
            data: contracts,
        });

    } catch (error) {
        console.error("LIST CONTRACTS WITH PARAMS ERROR", error);

        return res.status(500).json({
            ok: false,
            message: "No se pudieron obtener los contratos",
        });
    }
}