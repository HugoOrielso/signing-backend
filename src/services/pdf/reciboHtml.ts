// src/services/recibo/reciboHtml.ts

import { TemplateKey } from "../../lib/email/templateConfig";
export type ProductoItem = {
  valor: string;
  codigo: string;
  descripcion: string;
};
export type ReciboConformidadForPdf = {
  numeroRecibo: number;
  ciudad: string | null;
  clienteNombre: string;
  clienteCC: string | null;
  clienteEmail: string | null;

  productos?: ProductoItem[];

  textoRecibido: string | null;
  fechaFirma: Date | null;

  tipoFirma: string | null;
  firmaImagenUrl: string | null;
  firmaTexto: string | null;

  contract: {
    templateKey: string | null;
    consecutivo: string | number | null;
  };
};

const empresaConfig: Record<
  TemplateKey,
  {
    logoUrl: string;
    nombre: string;
    subtitulo: string;
    slogan: string;
    nit: string;
    email: string;
    web: string;
  }
> = {
  dimcultura: {
    logoUrl: "https://TU-DOMINIO.com/assets/logo_dimcultura.png",
    nombre: "DIMCULTURA S.A.S.",
    subtitulo: "Nueva Dimensión Cultural",
    slogan: "Un mundo en el que debes estar",
    nit: "900.683.382-3",
    email: "servicioalcliente@dimcultura.com",
    web: "www.dimcultura.com",
  },
  gruculcol: {
    logoUrl: "https://TU-DOMINIO.com/assets/gruculcol.png",
    nombre: "GRUCULCOL",
    subtitulo: "Grupo Cultural Colombiano",
    slogan: "Educación sin fronteras",
    nit: "27.898.189-5",
    email: "servicioalcliente@dimcultura.com",
    web: "www.dimcultura.com",
  },
};

function resolveTemplateKey(value?: string | null): TemplateKey {
  return value === "gruculcol" ? "gruculcol" : "dimcultura";
}

function formatDate(date?: Date | null) {
  return date
    ? new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
    : "";
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function generateReciboConformidadHtml(
  recibo: ReciboConformidadForPdf,
  options?: {
    logoBase64?: string;
    logoMime?: string;
  },
) {
  const templateKey = resolveTemplateKey(recibo.contract.templateKey);
  const empresa = empresaConfig[templateKey];
  const productos = recibo.productos ?? [];

  const total = productos.reduce(
    (acc, p) =>
      acc +
      (parseFloat(
        String(p.valor ?? "").replace(/[^0-9.]/g, "")
      ) || 0),
    0
  );


  const productoRows = productos
    .map(
      (p) => `
<tr>
  <td style="${tdStyle}">
    ${escapeHtml(p.codigo)}
  </td>

  <td style="${tdStyle}"></td>

  <td style="${tdStyle}">
    ${escapeHtml(p.descripcion)}
  </td>

  <td style="${tdStyle};text-align:right">
    $${Number(p.valor).toLocaleString("es-CO")}
  </td>
</tr>
`
    )
    .join("");


  const emptyRows = Math.max(
    0,
    2 - productos.length
  );

  const emptyRowsHtml = Array.from({
    length: emptyRows,
  })
    .map(
      () => `
<tr>
  <td style="${tdStyle}">&nbsp;</td>
  <td style="${tdStyle}"></td>
  <td style="${tdStyle}"></td>
  <td style="${tdStyle}"></td>
</tr>
`
    )
    .join("");

  const fecha = formatDate(recibo.fechaFirma ?? new Date());
  const clienteNombre = escapeHtml(recibo.clienteNombre);
  const clienteCC = escapeHtml(recibo.clienteCC);
  const ciudad = escapeHtml(recibo.ciudad);
  const consecutivo = escapeHtml(recibo.contract.consecutivo);
  const textoRecibido = escapeHtml(
    recibo.textoRecibido ??
    "los productos y/o servicios relacionados en el pagaré y contrato asociado.",
  );

  const logoSrc = options?.logoBase64
    ? `data:${options.logoMime ?? "image/webp"};base64,${options.logoBase64}`
    : empresa.logoUrl;

  const firmaHtml =
    recibo.tipoFirma === "DRAWN" && recibo.firmaImagenUrl
      ? `<img src="${recibo.firmaImagenUrl}" class="signature-img" />`
      : `<div class="typed-signature">${escapeHtml(
        recibo.firmaTexto ?? recibo.clienteNombre,
      )}</div>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Recibo de conformidad</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 26px;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #ffffff;
    }

    .page {
      width: 100%;
      min-height: 100%;
      border: 2px solid #e5e5e5;
      border-radius: 18px;
      padding: 34px 38px 28px;
    }

    .header {
      display: grid;
      grid-template-columns: 120px 1fr 210px;
      align-items: center;
      gap: 18px;
      margin-bottom: 10px;
    }

    .logo-box {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo {
      max-width: 82px;
      max-height: 82px;
      object-fit: contain;
    }

    .company {
      text-align: center;
      line-height: 1.15;
    }

    .company-subtitle {
      font-size: 13px;
      font-weight: 700;
    }

    .company-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: .02em;
    }

    .company-slogan {
      font-size: 10px;
      font-style: italic;
      color: #333;
      margin-top: 2px;
    }

    .company-data {
      margin-top: 4px;
      font-size: 8px;
      font-weight: 700;
    }

    .receipt-box {
      display: flex;
      flex-direction: column;
      border: 1px solid #777;
      padding: 9px 14px;
      font-size: 10px;
      border-radius: 8px;
      min-width: 200px;
    }

    .receipt-date {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 13px;
    }

    .receipt-date strong {
      font-size: 10px;
    }

    .receipt-date span {
      flex: 1;
      border-bottom: 1px solid #777;
      text-align: center;
      padding-bottom: 2px;
    }

    .receipt-number {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .separator {
      border-top: 1px solid #777;
      margin: 6px 0;
    }

    .address {
      text-align: center;
      font-size: 7.2px;
      line-height: 1.25;
      color: #333;
      padding: 4px 0;
    }

    .field-row {
      display: grid;
      grid-template-columns: 90px 1fr;
      align-items: end;
      gap: 20px;
      margin-top: 22px;
      font-size: 16px;
    }

    .field-row .label {
      font-weight: 800;
    }

    .field-row .value {
      border-bottom: 1px solid #ddd;
      padding: 0 8px 8px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .intro {
      margin-top: 44px;
      font-size: 20px;
      font-weight: 900;
      line-height: 1.8;
    }

    .received-box {
      margin-top: 24px;
      border: 1px solid #e2e2e2;
      background: #f8fbff;
      border-radius: 18px;
      padding: 28px 26px;
      font-size: 16px;
      color: #0f2240;
      line-height: 1.6;
    }

    .signature-section {
      margin-top: 170px;
      width: 330px;
      text-align: center;
    }

    .signature-img {
      max-width: 290px;
      max-height: 92px;
      object-fit: contain;
      display: block;
      margin: 0 auto 8px;
    }

    .typed-signature {
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 30px;
      line-height: 1.1;
      margin-bottom: 12px;
      white-space: nowrap;
    }

    .signature-line {
      border-top: 1px solid #d8d8d8;
      padding-top: 10px;
      font-size: 14px;
    }

    .signature-role {
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .signature-id {
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="page">
    <header class="header">
      <div class="logo-box">
        <img src="${logoSrc}" class="logo" />
      </div>

      <div class="company">
        <div class="company-subtitle">${empresa.subtitulo}</div>
        <div class="company-name">${empresa.nombre}</div>
        <div class="company-slogan">"${empresa.slogan}"</div>
        <div class="company-data">
          Nit. ${empresa.nit} - Tel. 310 207 98 00 / 311 861 01 61
        </div>
      </div>

      <div class="receipt-box">
        <div class="receipt-date">
          <strong>FECHA:</strong>
          <span>${fecha}</span>
        </div>

        <div class="receipt-number">
          <span>RECIBO DE CONFORMIDAD N°</span>
          <strong>${recibo.numeroRecibo}</strong>
        </div>
      </div>
    </header>

    <div class="separator"></div>

    <div class="address">
      Sede Administrativa: Calle 24 No. 5-40 Conjunto Los Ángeles Barrio Gran Colombia Casa G1 Villa del Rosario Col/
      Dirección Cartagena: Lote 1 Barrio El Country Tel. 6512857
      <strong>${empresa.email} · ${empresa.web}</strong>
    </div>

    <div class="separator"></div>

    <section>
      <div class="field-row">
        <div class="label">Ciudad:</div>
        <div class="value">${ciudad}</div>
      </div>

      <div class="field-row">
        <div class="label">Cliente:</div>
        <div class="value">${clienteNombre}</div>
      </div>

      <div class="intro">
        Manifiesto haber recibido de la Empresa ${empresa.nombre.replace(
    " S.A.S.",
    "",
  )}, en buen estado y a mi entera conformidad como comprador de:
      </div>

<div style="position:relative;margin-top:25px">

  <table
    style="
      width:100%;
      border-collapse:collapse;
      font-size:11px;
      border-radius:4px;
    "
  >
    <thead>
      <tr>
        <th style="${thStyle};width:70px">
          CODIGO
        </th>

        <th style="${thStyle};width:20px">
          C
        </th>

        <th style="${thStyle}">
          DESCRIPCIÓN
        </th>

        <th
          style="${thStyle};
          width:120px;
          text-align:right"
        >
          VALOR
        </th>
      </tr>
    </thead>

    <tbody>
      ${productoRows}
      ${emptyRowsHtml}
    </tbody>
  </table>

</div>

    <div
      style="
        display:flex;
        justify-content:flex-end;
        margin-top:10px;
      "
    >
      <table
        style="
          border-collapse:collapse;
          font-size:12px;
        "
      >
        <tr>
          <td
            style="
              font-weight:700;
              padding:2px 10px;
              border:1px solid #000;
              background:#1a1a2e;
              color:white;
            "
          >
            TOTAL RECIBIDO
          </td>

          <td
            style="
              padding:2px 18px;
              border:1px solid #000;
              text-align:right;
              font-weight:700;
              min-width:120px;
            "
          >
            $${total.toLocaleString("es-CO")}
          </td>
        </tr>
      </table>
    </div>

      <div class="signature-section">
        ${firmaHtml}

        <div class="signature-line">
          <div class="signature-role">CLIENTE</div>
          <div class="signature-id">C.C. ${clienteCC}</div>
        </div>
      </div>
    </section>
  </div>
</body>
</html>
`;
}

const thStyle = `
  background:#1c1e34;
  color:#fff;
  font-weight:600;
  padding:4px 6px;
  border:1px solid #3a3c52;
  text-align:left;
`;

const tdStyle = `
  border:1px solid #3a3c52;
  padding:3px 6px;
`;