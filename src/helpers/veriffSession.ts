// src/lib/veriff-signature.ts
import crypto from "crypto";


export function createVeriffSignature(payload: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex")
    .toLowerCase();
}

export function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}