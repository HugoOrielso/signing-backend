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

export async function getAdminOperationalSummary(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const adminId = req.user?.id;
    const role = req.user?.role;

    if (!adminId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    if (role !== "ADMIN") {
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

    const contracts = await prisma.contract.findMany({
      where: {
        createdAt: {
          gte: range.startDate,
          lte: range.endDate,
        },
        status: {
          not: "CANCELLED",
        },
      },
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
            empresaTrabajo: true,
            sumaTotal: true,
            numeroCuotas: true,
            valorCuota: true,
          },
        },
      },
    });

    const byAsesor = contracts.reduce<Record<string, any>>((acc, contract) => {
      const asesor = contract.libranzaData?.asesor || "Sin asesor";

      if (!acc[asesor]) {
        acc[asesor] = {
          asesor,
          totalContracts: 0,
          totalSumaTotal: 0,
          totalCuotas: 0,
          totalValorCuotas: 0,
          signedContracts: 0,
          activeContracts: 0,
          rejectedContracts: 0,
          contracts: [],
        };
      }

      acc[asesor].totalContracts += 1;
      acc[asesor].totalSumaTotal += contract.libranzaData?.sumaTotal ?? 0;
      acc[asesor].totalCuotas += contract.libranzaData?.numeroCuotas ?? 0;
      acc[asesor].totalValorCuotas += contract.libranzaData?.valorCuota ?? 0;

      if (contract.status === "SIGNED") acc[asesor].signedContracts += 1;
      if (contract.status === "REJECTED") acc[asesor].rejectedContracts += 1;
      if (contract.status !== "SIGNED" && contract.status !== "CANCELLED") {
        acc[asesor].activeContracts += 1;
      }

      acc[asesor].contracts.push({
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        createdAt: contract.createdAt,
        clienteNombre: contract.libranzaData?.clienteNombre ?? null,
        clienteCC: contract.libranzaData?.clienteCC ?? null,
        sumaTotal: contract.libranzaData?.sumaTotal ?? 0,
        numeroCuotas: contract.libranzaData?.numeroCuotas ?? 0,
        valorCuota: contract.libranzaData?.valorCuota ?? 0,
        analyst: contract.assignedTo?.name ?? null,
      });

      return acc;
    }, {});

    const byAnalyst = contracts.reduce<Record<string, any>>((acc, contract) => {
      const key = contract.assignedTo?.id || "sin-analista";
      const analystName = contract.assignedTo?.name || "Sin analista";

      if (!acc[key]) {
        acc[key] = {
          analystId: contract.assignedTo?.id ?? null,
          analystName,
          analystEmail: contract.assignedTo?.email ?? null,
          totalContracts: 0,
          totalSumaTotal: 0,
          totalCuotas: 0,
          signedContracts: 0,
          activeContracts: 0,
          rejectedContracts: 0,
          contracts: [],
        };
      }

      acc[key].totalContracts += 1;
      acc[key].totalSumaTotal += contract.libranzaData?.sumaTotal ?? 0;
      acc[key].totalCuotas += contract.libranzaData?.numeroCuotas ?? 0;

      if (contract.status === "SIGNED") acc[key].signedContracts += 1;
      if (contract.status === "REJECTED") acc[key].rejectedContracts += 1;
      if (contract.status !== "SIGNED" && contract.status !== "CANCELLED") {
        acc[key].activeContracts += 1;
      }

      acc[key].contracts.push({
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        createdAt: contract.createdAt,
        asesor: contract.libranzaData?.asesor ?? null,
        clienteNombre: contract.libranzaData?.clienteNombre ?? null,
        clienteCC: contract.libranzaData?.clienteCC ?? null,
        sumaTotal: contract.libranzaData?.sumaTotal ?? 0,
        numeroCuotas: contract.libranzaData?.numeroCuotas ?? 0,
        valorCuota: contract.libranzaData?.valorCuota ?? 0,
        assignedAt: contract.assignedAt,
      });

      return acc;
    }, {});

    return res.json({
      ok: true,
      data: {
        range,
        byAsesor: Object.values(byAsesor),
        byAnalyst: Object.values(byAnalyst),
      },
    });
  } catch (error) {
    console.error("ADMIN OPERATIONAL SUMMARY ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el resumen operativo",
    });
  }
}