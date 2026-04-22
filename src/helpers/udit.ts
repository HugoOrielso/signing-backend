import { Request } from "express";

export function getPublicAuditContext(req: Request) {
  return {
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      null,
    userAgent: req.get("user-agent") ?? null,
    requestId: (req.headers["x-request-id"] as string) ?? null,
    sessionId: req.cookies?.public_contract_session ?? null,
  };
}


export async function safeAudit(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error("AUDIT ERROR:", error);
  }
}