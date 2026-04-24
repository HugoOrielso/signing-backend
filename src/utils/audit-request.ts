import type { Request } from "express";

function normalizeIp(ip?: string | null) {
  if (!ip) return null;

  return ip
    .replace("::ffff:", "")
    .trim();
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return normalizeIp(forwardedFor.split(",")[0]);
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return normalizeIp(forwardedFor[0].split(",")[0]);
  }

  const realIp = req.headers["x-real-ip"];

  if (typeof realIp === "string") {
    return normalizeIp(realIp);
  }

  return normalizeIp(req.ip ?? req.socket.remoteAddress ?? null);
}

export function getAuditRequestContext(req: Request) {
  return {
    ipAddress: getClientIp(req),
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