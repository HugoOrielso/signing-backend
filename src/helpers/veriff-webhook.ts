// src/lib/veriff-webhook.ts
import crypto from "crypto";

export function createVeriffSignatureFromRawBody(
  rawBody: Buffer,
  secret: string
) {
  return crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")
    .toLowerCase();
}

export function safeCompareHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function parseRawJson<T>(rawBody: Buffer): T {
  return JSON.parse(rawBody.toString("utf8")) as T;
}