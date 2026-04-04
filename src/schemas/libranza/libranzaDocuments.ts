// src/schemas/contract-document.schema.ts
import { z } from "zod";

export const uploadDocumentSchema = z.object({
  type: z.enum([
    "ID_FRONT",
    "ID_BACK",
    "SELFIE_WITH_ID",
    "BANK_CERTIFICATE",
    "PAYROLL_STUB",
  ]),
  source: z.enum(["CAMERA", "FILE_UPLOAD"]),
});