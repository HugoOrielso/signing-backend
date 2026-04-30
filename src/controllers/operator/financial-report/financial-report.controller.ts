import type { Response } from "express";
import { AuthenticatedRequest } from "../../../types/types";
import { prisma } from "../../../database/db";

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(endDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function getDaysDifference(startDate: Date, endDate: Date) {
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
}

function resolveDateRange(queryStartDate?: unknown, queryEndDate?: unknown) {
  if (!queryStartDate || !queryEndDate) {
    return getDefaultDateRange();
  }

  const startDate = new Date(String(queryStartDate));
  const endDate = new Date(String(queryEndDate));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Rango de fechas inválido");
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (startDate > endDate) {
    throw new Error("La fecha inicial no puede ser mayor a la fecha final");
  }

  if (getDaysDifference(startDate, endDate) > 30) {
    throw new Error("El rango de fechas no puede superar los 30 días");
  }

  return { startDate, endDate };
}

function capitalize(value?: string | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export async function getMyFinancialSummary(
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

    if (role !== "OPERATOR" && role !== "CREDIT_ANALYST") {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para ver este resumen",
      });
    }

    let range;

    try {
      range = resolveDateRange(req.query.startDate, req.query.endDate);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        message: error instanceof Error ? error.message : "Rango inválido",
      });
    }

    const where: any = {
      createdAt: {
        gte: range.startDate,
        lte: range.endDate,
      },
      status: {
        not: "CANCELLED",
      },
    };

    if (role === "OPERATOR") {
      where.adminId = adminId;
    }

    if (role === "CREDIT_ANALYST") {
      where.assignedToId = adminId;
    }

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        status: true,
        amount: true,
        createdAt: true,
        assignedAt: true,
        consecutivo: true,
        templateKey: true,

        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        libranzaData: {
          select: {
            asesor: true,
            clienteNombre: true,
            clienteCC: true,
            clienteTelefono: true,
            clienteEmail: true,
            empresaTrabajo: true,
            sumaTotal: true,
            numeroCuotas: true,
            valorCuota: true,
          },
        },
      },
    });

    const totalContracts = contracts.length;

    const totalSumaTotal = contracts.reduce(
      (acc, c) => acc + (c.libranzaData?.sumaTotal ?? 0),
      0
    );

    const totalCuotas = contracts.reduce(
      (acc, c) => acc + (c.libranzaData?.numeroCuotas ?? 0),
      0
    );

    const totalValorCuotas = contracts.reduce(
      (acc, c) => acc + (c.libranzaData?.valorCuota ?? 0),
      0
    );

    const signedContracts = contracts.filter(
      (c) => c.status === "SIGNED"
    ).length;

    const activeContracts = contracts.filter(
      (c) => c.status !== "SIGNED" && c.status !== "CANCELLED"
    ).length;

    return res.json({
      ok: true,
      data: {
        range,
        summary: {
          totalContracts,
          signedContracts,
          activeContracts,
          totalSumaTotal,
          totalCuotas,
          totalValorCuotas,
          averagePerContract:
            totalContracts > 0
              ? Math.round(totalSumaTotal / totalContracts)
              : 0,
        },
        contracts: contracts.map((contract) => ({
          id: contract.consecutivo,
          contractId: contract.id,
          contractNumber: contract.consecutivo,
          title: contract.title,
          status: contract.status,
          createdAt: contract.createdAt,
          templateKey: capitalize(contract.templateKey),

          cliente: {
            name: contract.libranzaData?.clienteNombre ?? null,
            identification: contract.libranzaData?.clienteCC ?? null,
            phone: contract.libranzaData?.clienteTelefono ?? null,
            email: contract.libranzaData?.clienteEmail ?? null,
            empresaTrabajo: contract.libranzaData?.empresaTrabajo ?? null,
          },

          operador: contract.admin
            ? {
                id: contract.admin.id,
                name: contract.admin.name,
                email: contract.admin.email,
                role: contract.admin.role,
              }
            : null,

          asesor: contract.libranzaData?.asesor ?? null,

          analista: contract.assignedTo
            ? {
                id: contract.assignedTo.id,
                name: contract.assignedTo.name,
                email: contract.assignedTo.email,
                role: contract.assignedTo.role,
                assignedAt: contract.assignedAt,
              }
            : null,

          cuotas: {
            sumaTotal: contract.libranzaData?.sumaTotal ?? 0,
            numeroCuotas: contract.libranzaData?.numeroCuotas ?? 0,
            valorCuota: contract.libranzaData?.valorCuota ?? 0,
          },
        })),
      },
    });
  } catch (error) {
    console.error("MY FINANCIAL SUMMARY ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el resumen financiero",
    });
  }
}