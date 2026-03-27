import type { Request } from "express";

export function getAuditRequestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    requestId:
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : null,
    sessionId:
      typeof req.headers["x-session-id"] === "string"
        ? req.headers["x-session-id"]
        : null,
  };
}