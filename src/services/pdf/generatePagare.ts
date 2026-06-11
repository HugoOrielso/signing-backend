import { renderPdf } from "./renderPDF";
import { generatePagareHtml } from "./pagareHtml";

export async function generatePagarePdf(pagare: any): Promise<Buffer> {
  const html = await generatePagareHtml(pagare);
  return renderPdf(html);
}