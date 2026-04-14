import { Prisma } from "../../../../../generated/prisma/client";
import { TemplateKey } from "../../../../../lib/email/templateConfig";

const PREFIX_MAP = {
  dimcultura: "LS",
  gruculcol: "LG",
} as const satisfies Record<TemplateKey, string>;

export async function resolveConsecutivo(
  tx: Prisma.TransactionClient,
  templateKey: TemplateKey
) {
  // Bloquea la última fila de este templateKey hasta que termine el tx
  const [last] = await tx.$queryRaw<{ sequence: number }[]>`
    SELECT sequence FROM public."Contract"
    WHERE "templateKey" = ${templateKey}
    ORDER BY sequence DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  const sequence = (last?.sequence ?? 0) + 1;
  const prefix = PREFIX_MAP[templateKey];

  if (!prefix) {
    throw new Error(`No hay prefijo configurado para templateKey: ${templateKey}`);
  }

  return {
    sequence,
    code: `${prefix}-${String(sequence).padStart(3, "0")}`,
  };
}