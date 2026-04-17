// src/services/pagare/generatePagareHtml.ts

import { escHtml, F, FM, UF } from "../../helpers/pdfFormaters";

function formatDateTimeText(date?: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);

  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateText(date?: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);

  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function numberToSpanishWords(n: number): string {
  // Si ya tienes una función utilitaria existente, usa esa.
  // Aquí puedes reemplazarla por tu implementación real.
  return escHtml(String(n));
}

function renderSignature(signature?: {
  type: "TYPED" | "DRAWN";
  typedValue?: string | null;
  imageUrl?: string | null;
}) {
  if (!signature) {
    return `<div style="height:90px;"></div>`;
  }

  if (signature.type === "DRAWN" && signature.imageUrl) {
    return `
      <div style="height:90px; display:flex; align-items:flex-end;">
        <img
          src="${signature.imageUrl}"
          alt="Firma"
          style="max-height:85px; max-width:220px; object-fit:contain;"
        />
      </div>
    `;
  }

  if (signature.type === "TYPED" && signature.typedValue) {
    return `
      <div style="height:90px; display:flex; align-items:flex-end; font-family:cursive; font-size:28px;">
        ${escHtml(signature.typedValue)}
      </div>
    `;
  }

  return `<div style="height:90px;"></div>`;
}

export async function generatePagareHtml(pagare: {
  id: string;
  number: number;
  ciudadFirma?: string | null;
  fechaSuscripcion?: Date | string | null;
  fechaPrimeraCuota?: string | null;
  ciudadPago?: string | null;
  acreedorNombre: string;
  acreedorNit: string;
  deudorNombre: string;
  deudorDocumento: string;
  deudorDocumentoDe: string;
  deudorDireccion: string;
  deudorTelefono: string;
  deudorEmail: string;
  valorTotal: number;
  numeroCuotas: number;
  valorCuota: number;
  interesCorriente?: string | null;
  interesMora?: string | null;
  signedAt?: Date | string | null;
  signature?: {
    type: "TYPED" | "DRAWN";
    typedValue?: string | null;
    imageUrl?: string | null;
    signedAt?: Date | string | null;
  } | null;
}) {
  const valorTotalLetras = numberToSpanishWords(pagare.valorTotal);
  const valorCuotaLetras = numberToSpanishWords(pagare.valorCuota);

  const fechaSuscripcionTexto = pagare.fechaSuscripcion
    ? formatDateTimeText(pagare.fechaSuscripcion)
    : formatDateTimeText(pagare.signedAt);

  const fechaFirmaVisible = formatDateTimeText(
    pagare.signature?.signedAt || pagare.signedAt
  );

  const firmaHtml = renderSignature(
    pagare.signature
      ? {
          type: pagare.signature.type,
          typedValue: pagare.signature.typedValue,
          imageUrl: pagare.signature.imageUrl,
        }
      : undefined
  );

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Pagaré No. ${pagare.number}</title>
    <style>
      @page {
        size: A4;
        margin: 20mm 16mm 20mm 16mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
        font-size: 12px;
        line-height: 1.55;
      }

      .page {
        width: 100%;
      }

      .title {
        text-align: center;
        margin-bottom: 16px;
      }

      .title h1 {
        margin: 0;
        font-size: 22px;
        letter-spacing: 0.5px;
      }

      .title p {
        margin: 5px 0 0;
        font-size: 12px;
        color: #444;
      }

      .summary {
        border: 1px solid #ccc;
        background: #f7f7f7;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 18px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 18px;
      }

      .summary-item {
        break-inside: avoid;
      }

      .content p {
        margin: 0 0 10px;
        text-align: justify;
      }

      .clause {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .signatures {
        margin-top: 28px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 34px;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .signature-box {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .signature-label {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .signature-line {
        border-top: 1px solid #222;
        padding-top: 8px;
        margin-top: 8px;
      }

      .meta {
        margin-top: 18px;
        font-size: 10px;
        color: #555;
      }

      .avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="title">
        <h1>PAGARÉ</h1>
        <p>Documento de obligación de pago</p>
      </div>

      <div class="summary avoid-break">
        <div class="summary-grid">
          <div class="summary-item"><strong>Pagaré No.:</strong> ${pagare.number}</div>
          <div class="summary-item"><strong>Lugar y fecha de suscripción:</strong> ${F(
            pagare.ciudadFirma
          )}, ${escHtml(fechaSuscripcionTexto || "")}</div>
          <div class="summary-item"><strong>Valor total:</strong> ${valorTotalLetras} (${FM(
            String(pagare.valorTotal)
          )})</div>
          <div class="summary-item"><strong>Plazo:</strong> ${pagare.numeroCuotas} cuotas mensuales</div>
          <div class="summary-item"><strong>Interés corriente:</strong> ${F(
            pagare.interesCorriente || "Según tasa pactada sin exceder la máxima legal permitida"
          )}</div>
          <div class="summary-item"><strong>Interés de mora:</strong> ${F(
            pagare.interesMora || "Según la máxima legal permitida"
          )}</div>
          <div class="summary-item"><strong>Acreedor:</strong> ${F(pagare.acreedorNombre)}</div>
          <div class="summary-item"><strong>NIT acreedor:</strong> ${F(pagare.acreedorNit)}</div>
          <div class="summary-item" style="grid-column: span 2;">
            <strong>Lugar de pago:</strong> ${F(pagare.ciudadPago)}
          </div>
        </div>
      </div>

      <div class="content">
        <p class="clause">
          Yo, <strong>${F(pagare.deudorNombre)}</strong>, mayor de edad, identificado(a) con
          cédula de ciudadanía No. <strong>${F(pagare.deudorDocumento)}</strong> de
          <strong>${F(pagare.deudorDocumentoDe)}</strong>, domiciliado(a) en
          <strong>${F(pagare.deudorDireccion)}</strong>, con número de contacto
          <strong>${F(pagare.deudorTelefono)}</strong> y correo electrónico
          <strong>${F(pagare.deudorEmail)}</strong>, actuando en calidad de <strong>DEUDOR</strong>,
          por medio del presente documento declaro:
        </p>

        <p class="clause">
          <strong>PRIMERO. OBJETO:</strong> Que pagaré incondicionalmente, de manera indivisible y
          a la orden de <strong>${F(pagare.acreedorNombre)}</strong>, o de quien represente sus derechos,
          la suma de <strong>${valorTotalLetras}</strong> (${FM(String(pagare.valorTotal))}),
          junto con los intereses corrientes y moratorios a que haya lugar, de conformidad con
          las condiciones aquí pactadas.
        </p>

        <p class="clause">
          <strong>SEGUNDO. INTERESES:</strong> Sobre la suma adeudada reconoceré intereses corrientes
          a la tasa de <strong>${F(
            pagare.interesCorriente || "Según tasa pactada sin exceder la máxima legal permitida"
          )}</strong>, sin exceder la tasa máxima legal permitida. En caso de mora en el pago total
          o parcial de cualquiera de las cuotas pactadas, reconoceré intereses moratorios a la tasa de
          <strong>${F(pagare.interesMora || "Según la máxima legal permitida")}</strong>.
        </p>

        <p class="clause">
          <strong>TERCERO. PLAZO Y FORMA DE PAGO:</strong> La obligación contenida en este pagaré
          será pagada en <strong>${pagare.numeroCuotas}</strong> cuotas mensuales, iguales y sucesivas,
          cada una por valor de <strong>${valorCuotaLetras}</strong> (${FM(String(pagare.valorCuota))}).
          La primera cuota deberá pagarse a partir del mes de <strong>${F(
            pagare.fechaPrimeraCuota
          )}</strong> y las demás en forma mensual y consecutiva hasta la cancelación total de la obligación.
        </p>

        <p class="clause">
          <strong>CUARTO. RELACIÓN CON LA LIBRANZA:</strong> El presente pagaré respalda las obligaciones
          derivadas de la libranza y/o autorización de descuento suscrita por el deudor a favor de
          <strong>${F(pagare.acreedorNombre)}</strong>. En consecuencia, el deudor reconoce que los pagos
          podrán ser recaudados mediante descuento de nómina conforme a la autorización otorgada de manera separada.
        </p>

        <p class="clause">
          <strong>QUINTO. MORA:</strong> El simple retardo en el pago de cualquiera de las cuotas pactadas
          constituirá en mora al deudor, sin necesidad de requerimiento judicial o extrajudicial.
        </p>

        <p class="clause">
          <strong>SEXTO. CLÁUSULA ACELERATORIA:</strong> El tenedor legítimo de este pagaré podrá declarar
          vencido anticipadamente el plazo de todas las cuotas pendientes y exigir de inmediato el pago total
          de la obligación en los eventos legalmente procedentes y ante incumplimiento del deudor.
        </p>

        <p class="clause">
          <strong>SÉPTIMO. PAGO DIRECTO EN AUSENCIA DE DESCUENTO:</strong> En caso de que por cualquier motivo
          no sea posible efectuar el descuento por nómina, el deudor se obliga a pagar directamente las cuotas pendientes.
        </p>

        <p class="clause">
          <strong>OCTAVO. GASTOS DE COBRANZA:</strong> Serán a cargo del deudor todos los gastos y costos que
          ocasione el cobro judicial o extrajudicial de la obligación.
        </p>

        <p class="clause">
          <strong>NOVENO. CESIÓN Y ENDOSO:</strong> El acreedor queda expresamente facultado para ceder,
          negociar, endosar, transferir o enajenar a cualquier título el presente pagaré y los derechos incorporados en él.
        </p>

        <p class="clause">
          <strong>DÉCIMO. AUTORIZACIÓN DE CONSULTA Y REPORTE:</strong> El deudor autoriza de manera expresa,
          previa, informada e irrevocable a <strong>${F(pagare.acreedorNombre)}</strong>, o a quien represente sus derechos,
          para consultar, reportar y actualizar información ante operadores de información y centrales de riesgo,
          en los términos de la ley aplicable.
        </p>

        <p class="clause">
          <strong>DÉCIMO PRIMERO. LUGAR DE CUMPLIMIENTO:</strong> Para todos los efectos legales, el lugar de
          cumplimiento de las obligaciones derivadas del presente pagaré será la ciudad de
          <strong>${F(pagare.ciudadPago)}</strong>.
        </p>

        <p class="clause">
          <strong>DÉCIMO SEGUNDO. MÉRITO EJECUTIVO:</strong> El deudor reconoce expresamente que el presente
          documento presta mérito ejecutivo y contiene una obligación clara, expresa y exigible.
        </p>

        <p class="clause">
          <strong>DÉCIMO TERCERO. ACEPTACIÓN:</strong> Declaro que he leído, entendido y aceptado integralmente
          el contenido del presente pagaré, y que lo suscribo de manera libre y voluntaria.
        </p>

        <p>
          En constancia, se suscribe en <strong>${F(pagare.ciudadFirma)}</strong> el día
          <strong>${escHtml(fechaSuscripcionTexto || "")}</strong>.
        </p>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-label">El deudor</div>
          ${firmaHtml}
          <div class="signature-line">
            <div><strong>Nombre:</strong> ${UF(F(pagare.deudorNombre), 180)}</div>
            <div style="margin-top:8px;"><strong>C.C.:</strong> ${UF(
              `${F(pagare.deudorDocumento)} de ${F(pagare.deudorDocumentoDe)}`,
              180
            )}</div>
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-label">El acreedor</div>
          <div style="height:90px;"></div>
          <div class="signature-line">
            <div><strong>Razón social:</strong> ${UF(F(pagare.acreedorNombre), 180)}</div>
            <div style="margin-top:8px;"><strong>NIT:</strong> ${UF(
              F(pagare.acreedorNit),
              180
            )}</div>
          </div>
        </div>
      </div>

      <div class="meta">
        <div><strong>ID documento:</strong> ${escHtml(pagare.id)}</div>
        <div><strong>Fecha de firma:</strong> ${escHtml(fechaFirmaVisible || "")}</div>
      </div>
    </div>
  </body>
  </html>
  `;
}