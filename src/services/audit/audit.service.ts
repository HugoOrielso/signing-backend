import crypto from "node:crypto";
import { prisma } from "../../database/db";
import { AdminRole, AuditActorType, AuditEventType } from "../../generated/prisma/enums";
import { AuditLogInput } from "../../types/audit/audit.types";


const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

const stableStringify = (value: unknown) => {
  return JSON.stringify(sortObject(value ?? {}));
};

const buildAuditHash = (input: {
  contractId: string;
  signerId?: string | null;
  adminId?: string | null;
  eventType: AuditEventType;
  actorType: AuditActorType;
  actorRole?: AdminRole | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  documentHash?: string | null;
  metadata?: unknown;
  createdAt: string;
  previousEventHash?: string | null;
}) => {
  const payload = [
    input.contractId,
    input.signerId ?? "",
    input.adminId ?? "",
    input.eventType,
    input.actorType,
    input.actorRole ?? "",
    input.actorName ?? "",
    input.actorEmail ?? "",
    input.ipAddress ?? "",
    input.userAgent ?? "",
    input.sessionId ?? "",
    input.requestId ?? "",
    input.documentHash ?? "",
    stableStringify(input.metadata),
    input.createdAt,
    input.previousEventHash ?? "",
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
};

export const logAuditEvent = async (input: AuditLogInput) => {
  const lastEvent = await prisma.contractAuditEvent.findFirst({
    where: { contractId: input.contractId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const createdAt = new Date();
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

  const event = await prisma.contractAuditEvent.create({
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

      previousEventHash,
      eventHash,
      createdAt,
    },
  });

  return event;
};

export const getAuditTrailByContractId = async (contractId: string) => {
  return prisma.contractAuditEvent.findMany({
    where: { contractId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
};

export const verifyAuditTrail = async (contractId: string) => {
  const events = await prisma.contractAuditEvent.findMany({
    where: { contractId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let previousHash: string | null = null;

  for (const event of events) {
    const recalculatedHash = buildAuditHash({
      contractId: event.contractId,
      signerId: event.signerId,
      adminId: event.adminId,
      eventType: event.eventType,
      actorType: event.actorType,
      actorRole: event.actorRole,
      actorName: event.actorName,
      actorEmail: event.actorEmail,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      requestId: event.requestId,
      documentHash: event.documentHash,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      previousEventHash: event.previousEventHash,
    });

    if (event.previousEventHash !== previousHash) {
      return {
        valid: false,
        reason: "Broken previousEventHash chain",
        eventId: event.id,
      };
    }

    if (event.eventHash !== recalculatedHash) {
      return {
        valid: false,
        reason: "Event hash mismatch",
        eventId: event.id,
      };
    }

    previousHash = event.eventHash;
  }

  return {
    valid: true,
    totalEvents: events.length,
    lastEventHash: previousHash,
  };
};