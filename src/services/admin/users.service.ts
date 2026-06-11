
import { prisma } from "../../database/db";

export async function getAllUsers() {
    return prisma.admin.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

// ─── Obtener usuario por ID ───────────────────────────────────────────────────

export async function getUserById(id: string) {
    const user = await prisma.admin.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    if (!user) throw new Error("Usuario no encontrado");

    return user;
}

// ─── Desactivar usuario ───────────────────────────────────────────────────────

export async function deactivateUser(
    id: string,
    currentUserId: string
) {
    if (id === currentUserId) {
        throw new Error("No puedes desactivar tu propio usuario");
    }

    const user = await prisma.admin.findUnique({
        where: { id },
        select: {
            id: true,
            isActive: true,
            role: true,
        },
    });

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    if (!user.isActive) {
        throw new Error("El usuario ya está inactivo");
    }

    // Evitar dejar el sistema sin administradores
    if (user.role === "ADMIN") {
        const activeAdmins = await prisma.admin.count({
            where: {
                role: "ADMIN",
                isActive: true,
            },
        });

        if (activeAdmins <= 1) {
            throw new Error(
                "Debe existir al menos un administrador activo"
            );
        }
    }

    return prisma.admin.update({
        where: { id },
        data: {
            isActive: false,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    });
}
// ─── Editar usuario ───────────────────────────────────────────────────────────

export async function updateUser(
    id: string,
    data: {
        name?: string;
        email?: string;
        role?: "ADMIN" | "OPERATOR" | "CREDIT_ANALYST";
    }
) {
    const user = await prisma.admin.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!user) throw new Error("Usuario no encontrado");

    if (data.email) {
        const existing = await prisma.admin.findFirst({
            where: { email: data.email, NOT: { id } },
        });
        if (existing) throw new Error("El email ya está en uso");
    }

    return prisma.admin.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    });
}