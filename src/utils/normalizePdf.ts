import { PDFDocument } from "pdf-lib";

export async function normalizePdf(buffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });

  const normalizedBytes = await pdf.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });

  return Buffer.from(normalizedBytes);
}