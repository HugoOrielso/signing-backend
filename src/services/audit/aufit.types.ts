import { Prisma } from "../../generated/prisma/client";
import { AdminRole, AuditActorType, AuditEventType } from "../../generated/prisma/enums";

export type AuditMetadata = Prisma.JsonValue | null;

export type LogAuditEventInput = {
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
  metadata?: AuditMetadata;

  createdAt?: Date;
};

export type VerifyAuditTrailResult = {
  valid: boolean;
  reason?: string;
  eventId?: string;
};