import { Resend } from "resend";
import { getTemplateConfig, TemplateKey } from "./templateConfig";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCompanySignedReciboConformidadEmail({
  to,
  clienteNombre,
  pdfBuffer,
  fileName,
  templateKey,
}: {
  to: string;
  clienteNombre: string;
  pdfBuffer: Buffer;
  fileName: string;
  templateKey: string;
}) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@dimcultura.com>`;

  const subject = `✅ Recibo de conformidad firmado por ${clienteNombre}`;

  return resend.emails.send({
    from,
    to,
    subject,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
      },
    ],
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0"
          style="width:620px;max-width:620px;background:#ffffff;border:1px solid #e5edf8;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,0.08);">

          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #edf2fb;text-align:center;">
              <img
                src="${template.logoEmailUrl}"
                alt="${template.nombre}"
                style="max-width:220px;width:220px;height:auto;display:block;margin:0 auto 14px auto;"
              />

              <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">
                ${template.nombre}
              </p>

              <p style="margin:4px 0 4px;font-size:12px;color:#64748b;">
                ${template.subtitulo}
              </p>

              <p style="margin:0 0 14px;font-size:11px;color:#94a3b8;">
                NIT ${template.nit}
              </p>

              <div style="display:inline-block;background:#f1f6ff;border:1px solid #d9e6ff;color:#2563eb;
                font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;">
                ● Notificación interna · Recibo de conformidad firmado
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 34px 34px;">
              <div style="text-align:center;margin-bottom:22px;">
                <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;
                  background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);
                  font-size:28px;border:1px solid #cfe0ff;">
                  ✅
                </div>
              </div>

              <p style="margin:0 0 12px;text-align:center;font-size:30px;line-height:1.2;font-weight:800;color:#0f172a;">
                Recibo de conformidad firmado correctamente
              </p>

              <p style="margin:0 0 14px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                El cliente <strong>${clienteNombre}</strong> firmó correctamente el recibo de conformidad.
              </p>

              <p style="margin:0 0 26px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                Se adjunta una copia del recibo de conformidad firmado para registro interno.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);
                border:1px solid #e3ecfb;border-radius:22px;margin-bottom:22px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;
                    letter-spacing:1px;text-transform:uppercase;color:#2563eb;">
                      Estado del proceso
                    </p>

                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                      El recibo de conformidad fue firmado y registrado correctamente en el sistema de ${template.nombre}.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-top:28px;border-top:1px solid #edf2fb;">
                <tr>
                  <td style="padding-top:20px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">
                      ${template.nombre}
                    </p>

                    <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                      NIT ${template.nit} · ${template.email} · ${template.web}
                    </p>

                    <p style="margin:4px 0 0;font-size:11px;line-height:1.6;color:#94a3b8;">
                      "${template.slogan}"
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  });
}


export async function sendReciboConformidadNotificationEmail({
  to,
  clienteNombre,
  templateKey,
}: {
  to: string;
  clienteNombre: string;
  templateKey: string;
}) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@dimcultura.com>`;

  const subject = `✅ Has firmado electrónicamente — ${template.nombre}`;

  return resend.emails.send({
    from,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0"
          style="width:620px;max-width:620px;background:#ffffff;border:1px solid #e5edf8;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #edf2fb;text-align:center;">
              <img
                src="${template.logoEmailUrl}"
                alt="${template.nombre}"
                style="max-width:220px;width:220px;height:auto;display:block;margin:0 auto 14px auto;"
              />

              <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">
                ${template.nombre}
              </p>

              <p style="margin:4px 0 4px;font-size:12px;color:#64748b;">
                ${template.subtitulo}
              </p>

              <p style="margin:0 0 14px;font-size:11px;color:#94a3b8;">
                NIT ${template.nit}
              </p>

              <div style="display:inline-block;background:#f1f6ff;border:1px solid #d9e6ff;color:#2563eb;
                font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;">
                ✔ Documento firmado correctamente
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 34px 34px;">

              <div style="text-align:center;margin-bottom:22px;">
                <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;
                  background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);
                  font-size:28px;border:1px solid #cfe0ff;">
                  ✅
                </div>
              </div>

              <p style="margin:0 0 12px;text-align:center;font-size:26px;font-weight:800;color:#0f172a;">
                Firma electrónica exitosa
              </p>

              <p style="margin:0 0 16px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                Hola <strong>${clienteNombre}</strong>, has firmado electrónicamente
                tu recibo de conformidad de forma correcta.
              </p>

              <p style="margin:0 0 26px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                Tu firma quedó registrada en el sistema de ${template.nombre}.
                No necesitas realizar ninguna acción adicional.
              </p>

              <!-- INFO BOX -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);
                border:1px solid #e3ecfb;border-radius:22px;margin-bottom:8px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;
                    letter-spacing:1px;text-transform:uppercase;color:#2563eb;">
                      ¿Qué significa esto?
                    </p>

                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                      Este documento confirma que has recibido la información y condiciones del contrato de libranza,
                      y que estás conforme con lo firmado.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-top:28px;border-top:1px solid #edf2fb;">
                <tr>
                  <td style="padding-top:20px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">
                      ${template.nombre}
                    </p>

                    <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                      NIT ${template.nit} · ${template.email} · ${template.web}
                    </p>

                    <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">
                      "${template.slogan}"
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  });
}