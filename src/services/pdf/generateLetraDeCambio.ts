import { generateLetraCambioHtml, LetraCambioForPdf } from "./letraDeCambioHtml";
import { renderPdf } from "./renderPDF";

export async function generateLetraCambioPdf(
  letraCambio: LetraCambioForPdf
): Promise<Buffer> {
  const html = generateLetraCambioHtml(letraCambio);
  return renderPdf(html);
}