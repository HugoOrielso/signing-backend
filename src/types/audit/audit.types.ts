import { AdminRole, AuditActorType, AuditEventType } from "../../generated/prisma/enums";

export interface AuditLogInput {
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
  deviceFingerprint?: string | null;

  documentHash?: string | null;
  metadata?: unknown;
}