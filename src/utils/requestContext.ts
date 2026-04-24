import type { Request } from "express";

function normalizeIp(ip?: string | null): string | null {
  if (!ip) return null;

  return ip
    .replace("::ffff:", "")
    .trim();
}

export function getRequestContext(req: Request) {
  // 1. Intentar x-forwarded-for (proxy real)
  const forwardedFor = req.headers["x-forwarded-for"];

  let ip: string | null = null;

  if (typeof forwardedFor === "string") {
    ip = forwardedFor.split(",")[0];
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    ip = forwardedFor[0].split(",")[0];
  }

  // 2. Fallback a x-real-ip
  if (!ip && typeof req.headers["x-real-ip"] === "string") {
    ip = req.headers["x-real-ip"];
  }

  // 3. Fallback final Express
  if (!ip) {
    ip = req.ip || req.socket.remoteAddress || null;
  }

  return {
    ipAddress: normalizeIp(ip),
    userAgent: req.get("user-agent") ?? null,
    requestId:
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : null,
    sessionId:
      req.cookies?.public_contract_session ??
      (typeof req.headers["x-session-id"] === "string"
        ? req.headers["x-session-id"]
        : null),
  };
}