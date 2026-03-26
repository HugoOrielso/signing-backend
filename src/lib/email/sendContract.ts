import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendLibranzaEmailParams {
  to: string;
  clienteNombre: string;
  asesor?: string;
  signingLink: string;
}

export async function sendLibranzaEmail({
  to,
  clienteNombre,
  asesor,
  signingLink,
}: SendLibranzaEmailParams) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const response = await resend.emails.send({
    from,
    to,
    subject: `Dimcultura S.A.S — Tu libranza está lista para firmar`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Arial',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <div style="height:4px;background:linear-gradient(90deg,#c9a84c,#a07830);border-radius:2px;margin-bottom:24px;"></div>
            <p style="font-size:22px;font-weight:900;color:#c9a84c;margin:0;letter-spacing:1px;">
              Dimcultura S.A.S
            </p>
            <p style="font-size:12px;color:#7a6e5f;margin:6px 0 0;font-style:italic;">
              "Un mundo en el que debes estar"
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:15px;color:#1a1a2e;margin:0 0 16px;">
              Hola, <strong>${clienteNombre}</strong>
            </p>
            <p style="font-size:14px;color:#4a4a6a;line-height:1.7;margin:0 0 24px;">
              ${asesor ? `<strong>${asesor}</strong> de` : "El equipo de"} <strong>Dimcultura S.A.S</strong>
              ha preparado tu <strong>libranza</strong> y está lista para que la revises y firmes digitalmente.
            </p>

            <!-- Aviso verificación OTP -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#fffdf5;border-radius:10px;border:1.5px solid #c9a84c;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="font-size:13px;font-weight:700;color:#1a1a2e;margin:0 0 10px;">
                    🔐 Verificación de identidad requerida
                  </p>
                  <p style="font-size:13px;color:#4a4a6a;line-height:1.7;margin:0 0 10px;">
                    Antes de firmar, deberás verificar tu identidad con un
                    <strong>código de un solo uso (OTP)</strong> que te enviaremos al momento de acceder.
                  </p>
                  <p style="font-size:13px;color:#4a4a6a;line-height:1.7;margin:0 0 10px;">
                    El código será enviado a este mismo correo:
                  </p>
                  <table cellpadding="0" cellspacing="0"
                    style="background:#f5f0e8;border-radius:8px;border-left:3px solid #a07830;">
                    <tr>
                      <td style="padding:10px 16px;">
                        <p style="font-size:14px;font-weight:700;color:#a07830;margin:0;word-break:break-all;">
                          📧 ${to}
                        </p>
                      </td>
                    </tr>
                  </table>
                  <p style="font-size:11px;color:#9a8e7f;margin:10px 0 0;line-height:1.5;">
                    Este proceso protege tu firma digital de acuerdo con la
                    <strong>Ley 527 de 1999</strong> y el <strong>Decreto 2364 de 2012</strong>
                    sobre comercio electrónico y firma electrónica en Colombia.
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#4a4a6a;line-height:1.7;margin:0 0 28px;">
              Cuando estés listo, haz clic en el botón, ingresa tu correo y sigue las instrucciones
              para recibir y usar tu código de verificación:
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:#1a1a2e;border-radius:10px;padding:0;">
                  <a href="${signingLink}"
                    style="display:inline-block;padding:16px 36px;color:#c9a84c;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                    ✍️ &nbsp; Revisar y Firmar Libranza
                  </a>
                </td>
              </tr>
            </table>

            <!-- Pasos -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f5f0e8;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="font-size:12px;font-weight:700;color:#1a1a2e;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">
                    Cómo firmar — 3 pasos
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="28" valign="top" style="padding-bottom:12px;">
                        <div style="width:22px;height:22px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#c9a84c;">1</div>
                      </td>
                      <td style="padding-bottom:12px;padding-left:10px;">
                        <p style="font-size:13px;color:#4a4a6a;margin:0;line-height:1.5;">
                          Haz clic en el botón de arriba e <strong>ingresa este correo</strong> (${to})
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding-bottom:12px;">
                        <div style="width:22px;height:22px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#c9a84c;">2</div>
                      </td>
                      <td style="padding-bottom:12px;padding-left:10px;">
                        <p style="font-size:13px;color:#4a4a6a;margin:0;line-height:1.5;">
                          Recibirás un <strong>código de 6 dígitos</strong> en este correo — ingrésalo para verificar tu identidad
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top">
                        <div style="width:22px;height:22px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#c9a84c;">3</div>
                      </td>
                      <td style="padding-left:10px;">
                        <p style="font-size:13px;color:#4a4a6a;margin:0;line-height:1.5;">
                          Revisa el documento y <strong>agrega tu firma digital</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Link fallback -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f5f0e8;border-radius:10px;border-left:4px solid #c9a84c;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="font-size:12px;color:#7a6e5f;margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                    ¿El botón no funciona?
                  </p>
                  <p style="font-size:12px;color:#7a6e5f;margin:0;word-break:break-all;">
                    Copia este enlace en tu navegador:<br>
                    <a href="${signingLink}" style="color:#a07830;">${signingLink}</a>
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#b0a898;line-height:1.6;margin:0;">
              Este enlace es válido por <strong>30 días</strong>. Si tienes preguntas, contáctanos en
              <a href="mailto:servicioalcliente@dimcultura.com" style="color:#a07830;">servicioalcliente@dimcultura.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1a1a2e;padding:20px 40px;text-align:center;">
            <p style="font-size:11px;color:#5a5a7a;margin:0;">
              Dimcultura S.A.S · Nit 900.585.322-4 · Calle 24 No. 5-40, Villa del Rosario<br>
              Tel. 6512857 · servicioalcliente@dimcultura.com · www.dimcultura.com
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  return response;
}

// Mantener la función anterior por compatibilidad con otros flujos
interface SendContractEmailParams {
  to: string;
  contractTitle: string;
  contractorName: string;
  signingLink: string;
}

export async function sendContractEmail({
  to,
  contractTitle,
  contractorName,
  signingLink,
}: SendContractEmailParams) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const response = await resend.emails.send({
    from,
    to,
    subject: `Contrato pendiente de firma: ${contractTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Tienes un contrato pendiente de firma</h2>
        <p>Hola,</p>
        <p><strong>${contractorName}</strong> te ha enviado un contrato para revisión y firma.</p>
        <p>
          <a href="${signingLink}" style="background:#1a1a2e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;">
            Revisar y firmar contrato
          </a>
        </p>
        <p>${signingLink}</p>
      </div>
    `,
  });

  return response;
}

// ── Email post-firma (cliente y admin) ────────────────────────────────────────
interface SendSignedEmailParams {
  to:            string;
  clienteNombre: string;
  downloadLink:  string;
  role:          "cliente" | "admin";
}

export async function sendSignedContractEmail({
  to, clienteNombre, downloadLink, role,
}: SendSignedEmailParams) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const isAdmin   = role === "admin";
  const subject   = isAdmin
    ? `✅ Libranza firmada — ${clienteNombre}`
    : `✅ Tu libranza ha sido firmada — Dimcultura S.A.S`;

  const bodyTitle = isAdmin
    ? `La libranza de <strong>${clienteNombre}</strong> fue firmada correctamente.`
    : `Hola <strong>${clienteNombre}</strong>, tu libranza ha sido firmada y registrada correctamente.`;

  const response = await resend.emails.send({
    from,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
            <div style="height:3px;background:linear-gradient(90deg,#c9a84c,#a07830);margin-bottom:20px;border-radius:2px;"></div>
            <p style="color:#c9a84c;font-size:18px;font-weight:700;margin:0;">Dimcultura S.A.S</p>
            <p style="color:#5a5a7a;font-size:11px;margin:4px 0 0;font-style:italic;">"Un mundo en el que debes estar"</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <!-- Check icon -->
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:inline-block;width:56px;height:56px;border-radius:50%;
                background:#e8f5ee;line-height:56px;font-size:26px;">✅</div>
            </div>
            <p style="color:#1a1a2e;font-size:16px;font-weight:700;text-align:center;margin:0 0 8px;">
              Libranza Firmada
            </p>
            <p style="color:#4a4a6a;font-size:14px;line-height:1.7;margin:0 0 24px;text-align:center;">
              ${bodyTitle}
            </p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:#1a1a2e;border-radius:10px;">
                  <a href="${downloadLink}"
                    style="display:inline-block;padding:14px 32px;color:#c9a84c;
                      font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                    📄 &nbsp; Ver y Descargar PDF
                  </a>
                </td>
              </tr>
            </table>
            <!-- Link fallback -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f5f0e8;border-radius:10px;border-left:4px solid #c9a84c;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-size:11px;color:#7a6e5f;margin:0 0 4px;font-weight:700;
                    text-transform:uppercase;letter-spacing:1px;">¿El botón no funciona?</p>
                  <p style="font-size:11px;color:#7a6e5f;margin:0;word-break:break-all;">
                    <a href="${downloadLink}" style="color:#a07830;">${downloadLink}</a>
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-size:11px;color:#b0a898;text-align:center;margin:0;">
              Nit. 900.585.322-4 · servicioalcliente@dimcultura.com · www.dimcultura.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return response;
}