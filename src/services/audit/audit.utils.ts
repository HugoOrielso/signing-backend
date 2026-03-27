import crypto from "crypto";

type NormalizedAuditPayload = {
  contractId: string;
  signerId: string | null;
  adminId: string | null;
  eventType: string;
  actorType: string;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  requestId: string | null;
  documentHash: string | null;
  metadata: unknown | null;
  createdAt: string;
  previousEventHash: string | null;
};

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep(obj[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

export function normalizeAuditPayload(input: {
  contractId: string;
  signerId?: string | null;
  adminId?: string | null;
  eventType: string;
  actorType: string;
  actorRole?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  documentHash?: string | null;
  metadata?: unknown | null;
  createdAt: string;
  previousEventHash?: string | null;
}): NormalizedAuditPayload {
  return {
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
    metadata: input.metadata == null ? null : sortKeysDeep(input.metadata),
    createdAt: input.createdAt,
    previousEventHash: input.previousEventHash ?? null,
  };
}

export function buildAuditHash(input: Parameters<typeof normalizeAuditPayload>[0]): string {
  const payload = normalizeAuditPayload(input);

  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}