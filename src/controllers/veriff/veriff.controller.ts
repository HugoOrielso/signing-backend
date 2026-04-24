// src/controllers/veriff.controller.ts
import { Response } from "express";
import { prisma } from "../../database/db";
import { createVeriffSession } from "../../services/veriff/veriff.service";
import { AuthenticatedPublicRequest } from "../../types/types";

const REUSABLE_VERIFF_STATUSES = [
  "PENDING_PROVIDER",
  "STARTED",
  "SUBMITTED",
  "PROCESSING",
  "MANUAL_REVIEW",
];

const RESETTABLE_VERIFF_STATUSES = [
  "REJECTED",
  "EXPIRED",
  "ABANDONED",
  "ERROR",
];

export const startIdentityVerification = async (
  req: AuthenticatedPublicRequest,
  res: Response
) => {
  try {
    const identifier = req.publicSession?.identifier?.trim();
    const identifierType = req.publicSession?.identifierType;
    const token = String(req.params.token);

    if (!identifier || !identifierType) {
      return res.status(401).json({
        ok: false,
        code: "PUBLIC_SESSION_INVALID",
        message: "Sesión pública inválida o expirada",
      });
    }

    let whereCondition: any = { token };

    if (identifierType === "EMAIL") {
      const email = identifier.toLowerCase();

      whereCondition = {
        token,
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
      };
    } else if (identifierType === "PHONE") {
      whereCondition = {
        token,
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
      };
    } else {
      return res.status(400).json({
        ok: false,
        code: "UNSUPPORTED_IDENTIFIER_TYPE",
        message: "Tipo de identificador no soportado",
      });
    }

    const contract = await prisma.contract.findFirst({
      where: whereCondition,
      include: {
        identityVerification: true,
        libranzaData: true,
        signers: {
          orderBy: { signerOrder: "asc" },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        ok: false,
        code: "CONTRACT_NOT_FOUND",
        message: "Contrato no encontrado",
      });
    }

    const existingVerification = contract.identityVerification;

    if (existingVerification?.status === "APPROVED") {
      return res.status(400).json({
        ok: false,
        code: "IDENTITY_ALREADY_VERIFIED",
        message: "La identidad ya fue verificada",
      });
    }

    /**
     * Si ya hay una sesión activa, NO creamos otra.
     * Esto evita duplicados por React StrictMode, refresh, doble click o retries.
     */
    if (
      existingVerification &&
      REUSABLE_VERIFF_STATUSES.includes(existingVerification.status) &&
      existingVerification.sessionUrl
    ) {
      return res.json({
        ok: true,
        data: {
          identityVerification: existingVerification,
          sessionUrl: existingVerification.sessionUrl,
          sessionId:
            existingVerification.providerRequestId ??
            existingVerification.providerReference,
          reused: true,
        },
      });
    }

    /**
     * Si existe verificación pero quedó en estado terminal fallido,
     * permitimos crear una sesión nueva.
     */
    if (
      existingVerification &&
      !RESETTABLE_VERIFF_STATUSES.includes(existingVerification.status)
    ) {
      return res.status(409).json({
        ok: false,
        code: "IDENTITY_VERIFICATION_CANNOT_BE_RESTARTED",
        status: existingVerification.status,
        message: "La verificación de identidad no puede reiniciarse en este estado",
      });
    }

    const debtor = contract.signers.find((s) => s.partyRole === "DEUDOR");

    const veriffResult = await createVeriffSession({
      contractId: contract.id,
      endUserId: contract.id,
      firstName: debtor?.name?.split(" ")[0],
      lastName: debtor?.name?.split(" ").slice(1).join(" ") || undefined,
      idNumber: contract.libranzaData?.clienteCC ?? undefined,
      documentCountry: "CO",
    });

    const sessionId = veriffResult?.verification?.id ?? veriffResult?.id ?? null;
    const sessionUrl = veriffResult?.verification?.url ?? null;

    if (!sessionId || !sessionUrl) {
      return res.status(502).json({
        ok: false,
        code: "VERIFF_SESSION_INVALID_RESPONSE",
        message: "Veriff no devolvió una sesión válida",
      });
    }

    const identityVerification = await prisma.identityVerification.upsert({
      where: { contractId: contract.id },
      update: {
        status: "PENDING_PROVIDER",
        provider: "VERIFF",
        providerRequestId: sessionId,
        providerReference: sessionId,
        providerStatus: "created",
        sessionUrl,
        endUserId: contract.id,
        vendorData: contract.id,
        documentNumber: contract.libranzaData?.clienteCC ?? null,
        fullName: debtor?.name ?? null,
        rejectionReason: null,
        notes: null,
        submittedAt: null,
      },
      create: {
        contractId: contract.id,
        status: "PENDING_PROVIDER",
        provider: "VERIFF",
        providerRequestId: sessionId,
        providerReference: sessionId,
        providerStatus: "created",
        sessionUrl,
        endUserId: contract.id,
        vendorData: contract.id,
        documentNumber: contract.libranzaData?.clienteCC ?? null,
        fullName: debtor?.name ?? null,
      },
    });

    return res.json({
      ok: true,
      data: {
        identityVerification,
        sessionUrl,
        sessionId,
        reused: false,
      },
    });
  } catch (error) {
    console.error("startIdentityVerification error:", error);
    return res.status(500).json({
      ok: false,
      code: "VERIFF_SESSION_CREATE_ERROR",
      message: "No se pudo iniciar la verificación de identidad",
    });
  }
};