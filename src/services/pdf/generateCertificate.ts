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
        Información del Firmante
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
          ${
            signer.signatureType === "TYPED" && signer.typedValue
              ? `<tr>
                  <td class="label">Valor firmado</td>
                  <td class="value typed-value">${signer.typedValue}</td>
                </tr>`
              : ""
          }
          <tr>
            <td class="label">Fecha y hora de firma</td>
            <td class="value">${formatDate(signer.signedAt)}</td>
          </tr>
          <tr>
            <td class="label">Dirección IP</td>
            <td class="value mono">${signer.ipAddress ?? "—"}</td>
          </tr>
          <tr>
            <td class="label">OTP verificado</td>
            <td class="value">
              <span class="badge ${signer.otpVerified ? "badge-yes" : "badge-no"}">
                ${signer.otpVerified ? "✓ Verificado" : "✗ No verificado"}
              </span>
            </td>
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
  const signersHtml = data.signers.map((s, i) => signerBlock(s, i)).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado de Firma — ${data.contractNumber ?? data.consecutivo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary:   #0f2d52;
      --accent:    #1d4ed8;
      --success:   #15803d;
      --success-bg:#dcfce7;
      --danger:    #b91c1c;
      --danger-bg: #fee2e2;
      --muted:     #6b7280;
      --border:    #e2e8f0;
      --bg:        #f8fafc;
      --text:      #0f172a;
      --white:     #ffffff;
    }

    html, body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      color: var(--text);
      background: var(--white);
    }

    /* ── PAGE LAYOUT ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 0;
      background: var(--white);
    }

    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      html, body { background: var(--white); }
      .page { box-shadow: none; }
    }

    /* ── HEADER ── */
    .header {
      background: var(--primary);
      padding: 28px 40px 22px;
      position: relative;
      overflow: hidden;
    }

    .header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #1d4ed8, #3b82f6, #1d4ed8);
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 4px 12px;
      color: rgba(255,255,255,0.85);
      font-size: 8pt;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .header h1 {
      color: var(--white);
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .header-sub {
      color: rgba(255,255,255,0.65);
      font-size: 9pt;
    }

    .header-meta {
      margin-top: 16px;
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .header-meta-item {
      color: rgba(255,255,255,0.7);
      font-size: 9pt;
    }

    .header-meta-item strong {
      color: var(--white);
      font-weight: 600;
      display: block;
      font-size: 10pt;
    }

    /* ── BODY ── */
    .body {
      padding: 32px 40px 40px;
    }

    /* ── CONTRACT SUMMARY ── */
    .contract-summary {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 32px;
    }

    .summary-item {}
    .summary-item .s-label {
      font-size: 8pt;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
    }
    .summary-item .s-value {
      font-size: 10.5pt;
      font-weight: 500;
      color: var(--text);
    }
    .summary-item .s-value.amount {
      color: var(--accent);
      font-weight: 700;
      font-size: 12pt;
    }

    /* ── SECTION ── */
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12pt;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 14px;
    }

    .section-number {
      width: 24px;
      height: 24px;
      background: var(--primary);
      color: var(--white);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* ── SIGNER BLOCK ── */
    .signer-block {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 24px;
      break-inside: avoid;
    }

    .signer-block .section-title {
      padding: 14px 20px 14px;
      margin: 0;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
    }

    /* ── TABLE ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }

    .info-table tr:not(:last-child) td {
      border-bottom: 1px solid var(--border);
    }

    .info-table td {
      padding: 9px 20px;
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
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt !important;
    }

    .small { font-size: 7.5pt !important; }

    .typed-value {
      font-style: italic;
      font-weight: 600;
      color: var(--primary);
    }

    /* ── BADGES ── */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }

    .badge-yes {
      background: var(--success-bg);
      color: var(--success);
    }

    .badge-no {
      background: var(--danger-bg);
      color: var(--danger);
    }

    /* ── HASH BLOCK ── */
    .hash-block {
      background: #0f172a;
      padding: 14px 20px;
    }

    .hash-label {
      font-size: 7.5pt;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .hash-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      color: #4ade80;
      word-break: break-all;
      letter-spacing: 0.04em;
    }

    /* ── LEGAL FOOTER ── */
    .legal-footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 2px solid var(--border);
    }

    .legal-title {
      font-size: 9pt;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .legal-text {
      font-size: 8pt;
      color: var(--muted);
      line-height: 1.7;
    }

    .legal-refs {
      margin-top: 10px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .legal-ref {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 7.5pt;
      color: var(--muted);
      font-weight: 500;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-badge">🔒 Firma Electrónica Verificada</div>
    <h1>Certificado de Firma</h1>
    <div class="header-sub">
      Documento con validez legal — generado automáticamente por el sistema
    </div>
    <div class="header-meta">
      <div class="header-meta-item">
        <strong>${data.contractNumber ?? "—"}</strong>
        N.º de contrato
      </div>
      <div class="header-meta-item">
        <strong>${data.consecutivo}</strong>
        Consecutivo
      </div>
      <div class="header-meta-item">
        <strong>${formatDate(data.generatedAt)}</strong>
        Fecha de emisión
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- CONTRACT SUMMARY -->
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

    <!-- SIGNERS -->
    ${signersHtml}

    <!-- LEGAL FOOTER -->
    <div class="legal-footer">
      <div class="legal-title">Marco Legal</div>
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