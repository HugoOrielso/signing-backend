import { getTemplateConfig, resolveTemplateKey } from "../../lib/email/templateConfig";
export interface SignerCertData {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  signedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  documentHash: string;
  signatureType: "TYPED" | "DRAWN" | "CLICK_TO_SIGN";
  typedValue?: string | null;
  otpVerified?: boolean;
}


export interface ContractCertData {
  contractNumber?: string | null;
  title: string;
  consecutivo: string;
  amount: number;
  currency?: string | null;
  generatedAt: Date;
  templateKey?: string | null;
  signers: SignerCertData[];
}

function formatDate(date: Date): string {
  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
function signerBlock(signer: SignerCertData, index: number): string {
  const signatureTypeLabel =
    signer.signatureType === "TYPED"
      ? "Firma tipada"
      : signer.signatureType === "DRAWN"
        ? "Firma dibujada"
        : "Clic para firmar";

  return `
    <div class="signer-block">
      <div class="section-title">
        <span class="section-number">${index + 1}</span>
        Información del firmante
      </div>

      <table class="info-table">
        <tbody>
          <tr>
            <td class="label">Nombre completo</td>
            <td class="value">${signer.name}</td>
          </tr>
          <tr>
            <td class="label">Correo electrónico</td>
            <td class="value">${signer.email ?? "—"}</td>
          </tr>
          <tr>
            <td class="label">Teléfono</td>
            <td class="value">${signer.phone ?? "—"}</td>
          </tr>
          <tr>
            <td class="label">Rol</td>
            <td class="value">${signer.role ?? "DEUDOR"}</td>
          </tr>
          <tr>
            <td class="label">Tipo de firma</td>
            <td class="value">${signatureTypeLabel}</td>
          </tr>
          <tr>
            <td class="label">Fecha y hora de firma</td>
            <td class="value">${formatDate(signer.signedAt)}</td>
          </tr>
          <tr>
            <td class="label">Dirección IP</td>
            <td class="value mono">${signer.ipAddress ?? "—"}</td>
          </tr>
          <tr>
            <td class="label">User-Agent</td>
            <td class="value mono small">${signer.userAgent ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      <div class="hash-block">
        <div class="hash-label">Hash SHA-256 del documento al momento de la firma</div>
        <div class="hash-value">${signer.documentHash}</div>
      </div>
    </div>
  `;
}

export function generateCertificateHtml(data: ContractCertData): string {
  
  console.log("[CERT DATA TEMPLATE KEY]", data.templateKey);

  const templateKey = resolveTemplateKey(data.templateKey);
  console.log("[CERT RESOLVED TEMPLATE KEY]", templateKey);

  const template = getTemplateConfig(templateKey);
  console.log("[CERT TEMPLATE]", template.nombre, template.logoEmailUrl);
  const signersHtml = data.signers.map((s, i) => signerBlock(s, i)).join("");
  const contractDisplayNumber = data.contractNumber ?? data.consecutivo ?? "—";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado de Firma — ${contractDisplayNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg-page: #f4f7fb;
      --bg-soft: #f8fbff;
      --bg-card: #ffffff;
      --border: #e3ecfb;
      --border-soft: #edf2fb;
      --primary: #2563eb;
      --primary-dark: #0f172a;
      --text: #0f172a;
      --text-soft: #475569;
      --muted: #64748b;
      --success: #15803d;
      --success-bg: #dcfce7;
      --hash-bg: #0b1220;
      --hash-text: #4ade80;
      --white: #ffffff;
    }

    html, body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      color: var(--text);
      background: var(--bg-page);
    }

    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      html, body {
        background: var(--white);
      }

      .page {
        box-shadow: none;
      }
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: var(--bg-card);
    }



    .header-top {
      text-align: center;
      margin-bottom: 18px;
    }

    .header-logo {
      max-width: 80px;
      width: 80px;
      height: auto;
      display: inline-block;
      margin: 0 auto 14px auto;
    }

    .header-badge {
      display: inline-block;
      background: #f1f6ff;
      border: 1px solid #d9e6ff;
      color: var(--primary);
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .header-title {
      text-align: start;
      margin-bottom: 8px;
      font-size: 20pt;
      line-height: 1.15;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: -0.03em;
    }

    .header-sub {
      text-align: start;
      color: var(--muted);
      font-size: 9.5pt;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .header-meta {
      display: flex;
      align-items: start;
      justify-content: center;
      gap: 14px;
    }

    .header-meta-item {
      background: var(--bg-soft);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 5px;
    }

    .header-meta-item strong {
      display: block;
      color: var(--primary-dark);
      font-size: 9.5pt;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .header-meta-item span {
      color: var(--muted);
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .body {
      padding: 28px 40px 40px;
    }

    .contract-summary {
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 22px 22px;
      margin-bottom: 15px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
    }

    .summary-item .s-label {
      font-size: 8pt;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 5px;
    }

    .summary-item .s-value {
      font-size: 10.5pt;
      font-weight: 500;
      color: var(--text);
      line-height: 1.5;
    }

    .summary-item .s-value.amount {
      color: var(--primary);
      font-weight: 800;
      font-size: 12pt;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12pt;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 14px;
    }

    .section-number {
      width: 26px;
      height: 26px;
      background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
      color: var(--white);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 700;
      flex-shrink: 0;
    }

    .signer-block {
      border: 1px solid var(--border);
      border-radius: 22px;
      overflow: hidden;
      margin-bottom: 15px;
      break-inside: avoid;
      background: var(--bg-card);
    }

    .signer-block .section-title {
      padding: 12px 16px;
      margin: 0;
      border-bottom: 1px solid var(--border-soft);
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
    }

    .info-table tr:not(:last-child) td {
      border-bottom: 1px solid var(--border-soft);
    }

    .info-table td {
      padding: 10px 20px;
      vertical-align: top;
    }

    .info-table td.label {
      width: 38%;
      font-size: 9pt;
      font-weight: 600;
      color: var(--muted);
      padding-right: 12px;
    }

    .info-table td.value {
      font-size: 9.5pt;
      color: var(--text);
      line-height: 1.6;
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.4pt !important;
    }

    .small {
      font-size: 7.4pt !important;
    }

    .typed-value {
      font-style: italic;
      font-weight: 700;
      color: var(--primary);
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 700;
    }

    .badge-yes {
      background: var(--success-bg);
      color: var(--success);
    }

    .hash-block {
      background: var(--hash-bg);
      padding: 14px 20px 16px;
    }

    .hash-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .hash-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.3pt;
      color: var(--hash-text);
      word-break: break-all;
      letter-spacing: 0.03em;
      line-height: 1.6;
    }

    .legal-footer {
      margin-top: 28px;
      padding: 22px 24px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }

    .legal-title {
      font-size: 9pt;
      font-weight: 800;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .legal-text {
      font-size: 8.4pt;
      color: var(--muted);
      line-height: 1.75;
    }

    .legal-refs {
      margin-top: 12px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .legal-ref {
      background: #f1f6ff;
      border: 1px solid #d9e6ff;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 7.3pt;
      color: var(--primary);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page">

    <div style="padding: 5px; display: flex; flex-direction: column;background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border-bottom: 1px solid var(--border-soft); items-center; justify-content: center;">
      <div style ="display:flex; justify-content: space-evenly; align-items:center; gap: 15px;"> 
        <div class="header-top">
<img
  class="header-logo"
  src="${template.logoEmailUrl}"
  alt="${template.nombre}"
/>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center; justify-content:start;">
          <div>
            <p class="header-title">Certificado de Firma # ${contractDisplayNumber}</p>

            <p style="font-size:9pt;font-weight:700;color:#475569;margin-bottom:4px;">
              ${template.nombre} · NIT ${template.nit}
            </p>

            <p class="header-sub">
              Documento generado automáticamente con información de firma,
              integridad del archivo y trazabilidad del proceso. <b>Emitido:</b> ${formatDate(data.generatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="body">

      <div class="contract-summary">
        <div class="summary-item">
          <div class="s-label">Descripción</div>
          <div class="s-value">${data.title}</div>
        </div>

        <div class="summary-item">
          <div class="s-label">Valor total</div>
          <div class="s-value amount">${formatCurrency(data.amount, data.currency ?? "COP")}</div>
        </div>

        <div class="summary-item">
          <div class="s-label">Total de firmantes</div>
          <div class="s-value">${data.signers.length} firmante${data.signers.length !== 1 ? "s" : ""}</div>
        </div>

        <div class="summary-item">
          <div class="s-label">Estado</div>
          <div class="s-value">
            <span class="badge badge-yes">✓ Firmado completamente</span>
          </div>
        </div>
      </div>

      ${signersHtml}

      <div class="legal-footer">
        <div class="legal-title">Marco legal</div>
        <div class="legal-text">
          Este certificado acredita que las personas identificadas suscribieron el contrato
          mediante firma electrónica válida. El hash SHA-256 garantiza la integridad del
          documento en el momento exacto de la firma. La dirección IP y el timestamp registrados
          constituyen evidencia del consentimiento electrónico prestado.
        </div>
        <div class="legal-refs">
          <span class="legal-ref">Ley 527 de 1999 — Comercio Electrónico</span>
          <span class="legal-ref">Decreto 2364 de 2012 — Firma Electrónica</span>
          <span class="legal-ref">Ley 1581 de 2012 — Protección de Datos</span>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}