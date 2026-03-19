import crypto from "node:crypto";

export function generatePublicToken() {
  return crypto.randomBytes(24).toString("hex");
}