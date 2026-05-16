export type LetraCambioForPdf = {
  id: string;
  contractId: string;

  tipoFirma: string | null;
  firmaImagenUrl: string | null;
  firmaTexto: string | null;
  fechaFirma: Date | null;

  signedIp?: string | null;
  signedUserAgent?: string | null;

  contract: {
    templateKey: string | null;
    consecutivo: string | number | null;
    contractNumber?: string | null;

    reciboConformidadData?: {
      clienteNombre: string;
      clienteCC: string | null;
      clienteEmail: string | null;
      ciudad: string | null;
    } | null;
  };
};

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function generateLetraCambioHtml(letraCambio: LetraCambioForPdf) {
  const clienteNombre =
    letraCambio.contract.reciboConformidadData?.clienteNombre ?? "Cliente";

  const clienteCC =
    letraCambio.contract.reciboConformidadData?.clienteCC ?? "";

  const firmaHtml =
    letraCambio.tipoFirma === "DRAWN" && letraCambio.firmaImagenUrl
      ? `<img src="${letraCambio.firmaImagenUrl}" class="signature-img" />`
      : `<div class="typed-signature">${escapeHtml(
          letraCambio.firmaTexto ?? clienteNombre
        )}</div>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Letra de cambio</title>

  <style>
    * {
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 36px;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .wrapper {
      width: 760px;
      border: 1px solid #2d2d2d;
      border-radius: 12px;
      overflow: hidden;
      background: #e9e9ec;
    }

    .document {
      display: grid;
      grid-template-columns: 120px 1fr;
      width: 100%;
    }

    .left {
      display: grid;
      grid-template-columns: 30px 30px 30px 30px;
      border-right: 1px solid #2d2d2d;
      background: #fff;
    }

    .accepted {
      grid-column: span 4;
      background: #2d2d2d;
      color: #fff;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
      padding: 5px 0;
    }

    .vertical-cell {
      position: relative;
      min-height: 220px;
      border-right: 1px solid #2d2d2d;
    }

    .vertical-cell:last-child {
      border-right: 0;
    }

    .vertical-label {
      position: absolute;
      bottom: 40px;
      left: 50%;
      width: 86px;
      transform: translateX(-50%) rotate(-90deg);
      transform-origin: center;
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      text-align: left;
      white-space: nowrap;
    }

    .signature-box {
      position: absolute;
      inset: 8px 0 34px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .signature-img {
      max-width: 140px;
      max-height: 38px;
      object-fit: contain;
      transform: rotate(-90deg);
      display: block;
    }

    .typed-signature {
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 13px;
      line-height: 1;
      white-space: nowrap;
      transform: rotate(-90deg);
    }

    .content {
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
    }

    .row {
      border-bottom: 1px solid #2d2d2d;
      padding: 5px 6px;
      min-height: 22px;
    }

    .row-top {
      display: grid;
      grid-template-columns: 1.2fr 45px 130px 60px 160px;
      align-items: center;
      border-bottom: 1px solid #2d2d2d;
      min-height: 34px;
      padding: 4px 4px;
    }

    .small-box {
      height: 22px;
      border: 1px solid #2d2d2d;
      border-radius: 6px;
      background: #fff;
    }

    .center {
      text-align: center;
    }

    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      border-bottom: 1px solid #2d2d2d;
      padding: 4px 6px;
    }

    .amount-row,
    .quota-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #2d2d2d;
      padding: 5px 6px;
      min-height: 22px;
      gap: 8px;
    }

    .line {
      display: inline-block;
      height: 1px;
      background: #2d2d2d;
      vertical-align: middle;
    }

    .bottom {
      display: grid;
      grid-template-columns: 1.25fr 0.7fr 1fr;
    }

    .bottom-col {
      border-right: 1px solid #2d2d2d;
    }

    .bottom-title {
      border-bottom: 1px solid #2d2d2d;
      text-align: center;
      font-size: 10px;
      font-weight: 900;
      padding: 3px 0;
    }

    .bottom-line {
      height: 20px;
      border-bottom: 1px solid #2d2d2d;
    }

    .bottom-line:last-child {
      border-bottom: 0;
    }

    .att {
      background: #fff;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 900;
    }

    .metadata {
      margin-top: 18px;
      font-size: 8px;
      color: #444;
      line-height: 1.5;
    }
  </style>
</head>

<body>
  <div class="page">
    <div>
      <div class="wrapper">
        <div class="document">
          <div class="left">
            <div class="accepted">ACEPTADA</div>

            <div class="vertical-cell">
              <div class="signature-box">
                ${firmaHtml}
              </div>
              <span class="vertical-label">Firma.</span>
            </div>

            <div class="vertical-cell">
              <span class="vertical-label">Cédula o NIT.</span>
            </div>

            <div class="vertical-cell">
              <span class="vertical-label">Codeudor.</span>
            </div>

            <div class="vertical-cell">
              <span class="vertical-label">Cédula o NIT.</span>
            </div>
          </div>

          <div class="content">
            <div class="row-top">
              <div>Fecha:</div>
              <div class="center">N°.</div>
              <div class="small-box"></div>
              <div class="center">Por $</div>
              <div class="small-box"></div>
            </div>

            <div class="row">Señor(es):</div>

            <div class="date-row">
              <span>El</span>
              <span>de</span>
              <span>del año</span>
            </div>

            <div class="row">
              Se servirá(n) ud.(s) pagar solidariamente en
            </div>

            <div class="row">
              por esta Única de Cambio sin protesto, excusado al aviso de rechazo a
            </div>

            <div class="row">
              la orden de
            </div>

            <div class="amount-row">
              <span>La cantidad de:</span>
              <span>($ <span class="line" style="width: 95px;"></span> )</span>
            </div>

            <div class="quota-row">
              <span>Pesos m/l en</span>
              <span>Cuotas(s) de $</span>
              <span>, más intereses durante el plazo de</span>
            </div>

            <div class="row" style="text-align:right;">
              %) mensual y de mora a la tasa máxima legal autorizada.
            </div>

            <div class="bottom">
              <div class="bottom-col">
                <div class="bottom-title">DIRECCIÓN ACEPTANTES</div>
                <div class="bottom-line"></div>
                <div class="bottom-line"></div>
                <div class="bottom-line"></div>
              </div>

              <div class="bottom-col">
                <div class="bottom-title">TELÉFONO</div>
                <div class="bottom-line"></div>
                <div class="bottom-line"></div>
                <div class="bottom-line"></div>
              </div>

              <div class="att">
                Atentamente,
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="metadata">
        Documento firmado electrónicamente por ${escapeHtml(clienteNombre)}
        ${clienteCC ? ` - C.C. ${escapeHtml(clienteCC)}` : ""}.
        Fecha de firma: ${letraCambio.fechaFirma?.toISOString() ?? ""}.
        IP: ${escapeHtml(letraCambio.signedIp)}.
      </div>
    </div>
  </div>
</body>
</html>
`;
}