import { Response } from "express";
import { prisma } from "../../database/db";
import { AuthenticatedPublicRequest } from "../../types/types";

export async function logoutPublicSession(
    req: AuthenticatedPublicRequest,
    res: Response
) {
    try {
        const sessionToken = req.cookies?.public_contract_session as
            | string
            | undefined;

        if (sessionToken) {
            await prisma.publicContractSession.deleteMany({
                where: { sessionToken },
            });
        }

        res.clearCookie("public_contract_session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        return res.json({
            ok: true,
            message: "Sesión cerrada correctamente",
        });
    } catch (error) {
        console.error("logoutPublicSession error:", error);
        return res.status(500).json({
            ok: false,
            message: "Error al cerrar sesión",
        });
    }
}


export async function getPublicContractsByUser(
  req: AuthenticatedPublicRequest,
  res: Response
) {
  try {
    const identifier = req.publicSession?.identifier?.trim();
    const identifierType = req.publicSession?.identifierType;

    if (!identifier || !identifierType) {
      return res.status(401).json({
        ok: false,
        message: "Sesión pública inválida o expirada",
      });
    }

    let contracts = [];

    if (identifierType === "EMAIL") {
      const email = identifier.toLowerCase();

      contracts = await prisma.contract.findMany({
        where: {
          OR: [
            {
              libranzaData: {
                is: {
                  clienteEmail: {
                    equals: email,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              signers: {
                some: {
                  email: {
                    equals: email,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          consecutivo: true,
          title: true,
          contractNumber: true,
          contractType: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          token: true,
          dataReviewStatus: true,
          dataReviewNotes: true,
          documents: {
            select: { id: true },
            take: 1,
          },
        },
      });
    } else if (identifierType === "PHONE") {
      contracts = await prisma.contract.findMany({
        where: {
          OR: [
            {
              libranzaData: {
                is: {
                  clienteTelefono: {
                    equals: identifier,
                  },
                },
              },
            },
            {
              signers: {
                some: {
                  phone: {
                    equals: identifier,
                  },
                },
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          consecutivo: true,
          title: true,
          contractNumber: true,
          contractType: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          token: true,
          dataReviewStatus: true,
          dataReviewNotes: true,
          documents: {
            select: { id: true },
            take: 1,
          },
        },
      });
    } else {
      return res.status(400).json({
        ok: false,
        message: "Tipo de identificador no soportado",
      });
    }

    const formattedContracts = contracts.map(
      ({ documents, amount, dataReviewNotes, ...contract }) => ({
        ...contract,
        amount: amount ? amount.toString() : null,
        hasAttachments: documents.length > 0,
        canSign: contract.status === "READY_TO_SIGN",
        dataReviewNotes: dataReviewNotes ?? null,
      })
    );

    return res.status(200).json({
      ok: true,
      message: "Contratos obtenidos correctamente",
      data: formattedContracts,
    });
  } catch (error) {
    console.error("Error getting public contracts by user:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener los contratos del usuario",
    });
  }
}

export const getPublicContractByToken = async (
    req: AuthenticatedPublicRequest,
    res: Response
) => {
    try {
        const email = req.publicSession?.email?.trim().toLowerCase();

        if (!email) {
            return res.status(401).json({ ok: false, message: "Sesión pública inválida o expirada" });
        }

        const token = String(req.params.token); // ← era req.params.id
        const contract = await prisma.contract.findFirst({
            where: {
                token,
            },
            include: {
                libranzaData: {
                    include: {
                        references: { orderBy: { createdAt: "asc" } },
                    },
                },
                signers: { orderBy: { signerOrder: "asc" } },
                signatures: {
                    select: {
                        id: true,
                        signerId: true,
                        type: true,
                        typedValue: true,
                        signedAt: true,
                        imageUrl: true
                    },
                },
                documents: { orderBy: { createdAt: "asc" } },
            },
        });

        if (!contract) {
            return res.status(404).json({ ok: false, message: "Contrato no encontrado" });
        }

        return res.json({ ok: true, data: contract });
    } catch (error) {
        console.error("GET PUBLIC CONTRACT BY TOKEN ERROR", error);
        return res.status(500).json({ ok: false, message: "Error al obtener el contrato" });
    }
};