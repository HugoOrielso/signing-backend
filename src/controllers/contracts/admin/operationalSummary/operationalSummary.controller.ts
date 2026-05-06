import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(endDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
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

  return { startDate, endDate };
}

function capitalize(value?: string | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export async function getAdminFilteredOperationalReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {

    const { operatorName, assignedToId, status } = req.query;
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
    };

    if (operatorName && operatorName !== "ALL") {
      where.admin = {
        is: {
          name: {
            contains: String(operatorName),
            mode: "insensitive",
          },
        },
      };
    }
    if (assignedToId && assignedToId !== "ALL") {
      where.assignedToId = String(assignedToId);
    }
    if (status && status !== "ALL") {
      where.status = String(status);
    }

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
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

    const averagePerContract =
      totalContracts > 0 ? Math.round(totalSumaTotal / totalContracts) : 0;

    const statusSummary = contracts.reduce<Record<string, number>>(
      (acc, contract) => {
        acc[contract.status] = (acc[contract.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const signedContracts = statusSummary.SIGNED ?? 0;
    const cancelledContracts = statusSummary.CANCELLED ?? 0;
    const rejectedContracts = statusSummary.REJECTED ?? 0;

    const activeContracts = contracts.filter(
      (contract) =>
        contract.status !== "SIGNED" && contract.status !== "CANCELLED"
    ).length;

    return res.json({
      ok: true,
      data: {
        range,
        filters: {
          operatorName:
            operatorName && operatorName !== "ALL"
              ? String(operatorName)
              : null,

          assignedToId:
            assignedToId && assignedToId !== "ALL"
              ? String(assignedToId)
              : null,

          status: status && status !== "ALL" ? String(status) : null,
        },
        summary: {
          totalContracts,
          signedContracts,
          activeContracts,
          rejectedContracts,
          cancelledContracts,
          totalSumaTotal,
          totalCuotas,
          totalValorCuotas,
          averagePerContract,
          statusSummary,
        },
        statuses: Object.entries(statusSummary).map(([status, count]) => ({
          status,
          count,
        })),
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
    console.error("ADMIN FILTERED OPERATIONAL REPORT ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el reporte operativo",
    });
  }
}