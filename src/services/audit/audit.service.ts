import { prisma } from "../../database/db";
import { Prisma } from "../../generated/prisma/client";
import { buildAuditHash } from "./audit.utils";
import { LogAuditEventInput, VerifyAuditTrailResult } from "./aufit.types";
export async function logAuditEvent(
  input: LogAuditEventInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;

  const createdAt = input.createdAt ?? new Date();

  const lastEvent = await db.contractAuditEvent.findFirst({
    where: { contractId: input.contractId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      eventHash: true,
      createdAt: true,
    },
  });

  const previousEventHash = lastEvent?.eventHash ?? null;

  const eventHash = buildAuditHash({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    adminId: input.adminId ?? null,
    eventType: input.eventType,
    actorType: input.actorType,
    actorRole: input.actorRole ?? null,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    sessionId: input.sessionId ?? null,
    requestId: input.requestId ?? null,
    documentHash: input.documentHash ?? null,
    metadata: input.metadata ?? null,
    createdAt: createdAt.toISOString(),
    previousEventHash,
  });

  return db.contractAuditEvent.create({
    data: {
      contractId: input.contractId,
      signerId: input.signerId ?? null,
      adminId: input.adminId ?? null,
      eventType: input.eventType,
      actorType: input.actorType,
      actorRole: input.actorRole ?? null,
      actorName: input.actorName ?? null,
      actorEmail: input.actorEmail ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      sessionId: input.sessionId ?? null,
      requestId: input.requestId ?? null,
      documentHash: input.documentHash ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
      previousEventHash,
      eventHash,
      createdAt,
    },
  });
}

export async function getAuditTrailByContractId(contractId: string) {
  return prisma.contractAuditEvent.findMany({
    where: { contractId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      signer: {
        select: {
          id: true,
          name: true,
          email: true,
          signerOrder: true,
          partyRole: true,
        },
      },
      admin: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function verifyAuditTrail(contractId: string): Promise<VerifyAuditTrailResult> {
  const events = await prisma.contractAuditEvent.findMany({
    where: { contractId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let previousHash: string | null = null;

  for (const event of events) {
    if (event.previousEventHash !== previousHash) {
      return {
        valid: false,
        reason: "Broken previousEventHash chain",
        eventId: event.id,
      };
    }

    const recalculatedHash = buildAuditHash({
      contractId: event.contractId,
      signerId: event.signerId ?? null,
      adminId: event.adminId ?? null,
      eventType: event.eventType,
      actorType: event.actorType,
      actorRole: event.actorRole ?? null,
      actorName: event.actorName ?? null,
      actorEmail: event.actorEmail ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      sessionId: event.sessionId ?? null,
      requestId: event.requestId ?? null,
      documentHash: event.documentHash ?? null,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      previousEventHash: previousHash,
    });

    if (event.eventHash !== recalculatedHash) {
      return {
        valid: false,
        reason: "Event hash mismatch",
        eventId: event.id,
      };
    }

    previousHash = event.eventHash;
  }

  return { valid: true };
}

type PreventDuplicateAuditInput = {
  contractId: string;
  eventType: string;
  signerId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  sessionId?: string | null;
  withinSeconds: number;
};

export async function shouldSkipDuplicateAuditEvent(
  input: PreventDuplicateAuditInput
) {
  const since = new Date(Date.now() - input.withinSeconds * 1000);

  const recentEvents = await prisma.contractAuditEvent.findMany({
    where: {
      contractId: input.contractId,
      eventType: input.eventType as any,
      createdAt: {
        gte: since,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return recentEvents.some((event) => {
    const sameSigner =
      (input.signerId && event.signerId === input.signerId) ||
      (input.actorEmail &&
        event.actorEmail?.toLowerCase() === input.actorEmail.toLowerCase());

    const sameSession =
      input.sessionId &&
      event.sessionId &&
      event.sessionId === input.sessionId;

    const sameIp =
      input.ipAddress &&
      event.ipAddress &&
      event.ipAddress === input.ipAddress;

    return !!sameSigner && (!!sameSession || !!sameIp);
  });
}