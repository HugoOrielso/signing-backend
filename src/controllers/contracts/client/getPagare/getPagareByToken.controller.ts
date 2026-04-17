import type { Request, Response } from "express";
import { prisma } from "../../../../database/db";

export async function getPagareStatusByToken(req: Request, res: Response) {
  try {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const contract = await prisma.contract.findUnique({
      where: { token },
      select: {
        id: true,
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contrato no encontrado",
      });
    }

    const pagare = await prisma.pagare.findUnique({
      where: { contractId: contract.id },
      include: {
        signature: true,
      },
    });

    return res.json({
      ok: true,
      hasPagare: !!pagare,
      isSigned: pagare?.status === "SIGNED",

      pagare: pagare
        ? {
          id: pagare.id,
          number: pagare.number,
          status: pagare.status,

          ciudadFirma: pagare.ciudadFirma,
          fechaSuscripcion: pagare.fechaSuscripcion,
          fechaPrimeraCuota: pagare.fechaPrimeraCuota,
          ciudadPago: pagare.ciudadPago,

          acreedorNombre: pagare.acreedorNombre,
          acreedorNit: pagare.acreedorNit,

          deudorNombre: pagare.deudorNombre,
          deudorDocumento: pagare.deudorDocumento,
          deudorDocumentoDe: pagare.deudorDocumentoDe,
          deudorDireccion: pagare.deudorDireccion,
          deudorTelefono: pagare.deudorTelefono,
          deudorEmail: pagare.deudorEmail,

          valorTotal: pagare.valorTotal,
          numeroCuotas: pagare.numeroCuotas,
          valorCuota: pagare.valorCuota,

          interesCorriente: pagare.interesCorriente,
          interesMora: pagare.interesMora,

          signedAt: pagare.signedAt,

          signature: pagare.signature
            ? {
              type: pagare.signature.type,
              typedValue: pagare.signature.typedValue,
              imageUrl: pagare.signature.imageUrl,
              signedAt: pagare.signature.signedAt,
            }
            : null,
        }
        : null,
    });
  } catch (error) {
    console.error("GET PAGARE STATUS ERROR", error);
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo estado del pagaré",
    });
  }
}