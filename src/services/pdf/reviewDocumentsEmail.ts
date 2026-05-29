import { Resend } from "resend";
import { getTemplateConfig, TemplateKey } from "../../lib/email/templateConfig";

const resend = new Resend(process.env.RESEND_API_KEY);
interface SendUserDataRejectedEmailParams {
  to: string;
  clienteNombre: string;
  notes: string;
  templateKey: TemplateKey
};


export async function sendUserDataRejectedEmail({
  to,
  clienteNombre,
  notes,
  templateKey,
}: SendUserDataRejectedEmailParams) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@dimcultura.com>`;

  const subject = `⚠️ Tus datos fueron rechazados — acción requerida (${template.nombre})`;

  const portalUrl = `${process.env.FRONTEND_URL}/auth`;

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">

          <table width="620" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border:1px solid #e5edf8;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,0.08);">

            <!-- HEADER -->
            <tr>
              <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #edf2fb;text-align:center;">
                
                <img
                  src="${template.logoFile}"
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

                <div style="display:inline-block;background:#fef3f2;border:1px solid #fecaca;color:#b91c1c;
                  font-size:13px;font-weight:500;padding:10px 16px;border-radius:999px;">
                  ● Revisión requerida · Datos rechazados
                </div>

              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:36px 34px 34px;">

                <!-- ICON -->
                <div style="text-align:center;margin-bottom:22px;">
                  <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;
                    background:linear-gradient(180deg,#fef2f2 0%,#fee2e2 100%);
                    font-size:28px;border:1px solid #fecaca;">
                    ⚠️
                  </div>
                </div>

                <!-- TITLE -->
                <p style="margin:0 0 12px;text-align:center;font-size:26px;font-weight:800;color:#0f172a;">
                  Información rechazada
                </p>

                <!-- TEXT -->
                <p style="margin:0 0 16px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Hola <strong>${escHtml(clienteNombre)}</strong>,
                </p>

                <p style="margin:0 0 18px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Hemos revisado la información enviada, pero
                  <strong>los datos fueron rechazados</strong>.
                </p>

                <p style="margin:0 0 24px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Es necesario realizar algunos ajustes antes de continuar con el proceso.
                </p>

                <!-- NOTES -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#fff;border:1px solid #fecaca;border-radius:18px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b91c1c;">
                        Observaciones del equipo
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#7f1d1d;">
                        ${notes}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- STEPS -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f8fbff;border:1px solid #dbe7ff;border-radius:18px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2563eb;">
                        ¿Qué debes hacer ahora?
                      </p>

                      <ol style="margin:0;padding-left:18px;color:#4b5b7c;font-size:14px;line-height:1.7;">
                        <li>Ingresa al portal de usuario.</li>
                        <li>Corrige la información solicitada.</li>
                        <li>Guarda los cambios para una nueva revisión.</li>
                      </ol>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <div style="text-align:center;margin-bottom:26px;">
                  <a href="${portalUrl}"
                    style="display:inline-block;padding:14px 26px;background:linear-gradient(90deg,#ef4444,#dc2626);
                    color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;
                    font-size:14px;box-shadow:0 6px 18px rgba(220,38,38,0.25);">
                    Revisar y corregir datos
                  </a>
                </div>

                <!-- EXTRA -->
                <p style="margin:0 0 20px;text-align:center;font-size:13px;line-height:1.7;color:#64748b;">
                  Una vez actualices la información, nuestro equipo volverá a revisarla.
                </p>

                <!-- FOOTER -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="margin-top:20px;border-top:1px solid #edf2fb;">
                  <tr>
                    <td style="padding-top:18px;text-align:center;">
                      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">
                        ${template.nombre}
                      </p>
                      <p style="margin:0;font-size:12px;color:#64748b;">
                        ${template.email} · ${template.web}
                      </p>
                      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">
                        NIT ${template.nit} · "${template.slogan}"
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
  `;

  return await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}


interface SendUserDataApprovedEmailParams {
  to: string;
  clienteNombre: string;
  templateKey: TemplateKey; // 👈 obligatorio
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export async function sendUserDataApprovedEmail({
  to,
  clienteNombre,
  templateKey,
}: SendUserDataApprovedEmailParams) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@dimcultura.com>`;

  const subject = `✅ Tus datos fueron aprobados — ya puedes firmar (${template.nombre})`;

  const portalUrl = 'https://dimcultura.com/auth';

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>

  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">

          <table width="620" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border:1px solid #e5edf8;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,0.08);">

            <tr>
              <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #edf2fb;text-align:center;">
                
                <img
                  src="${template.logoFile}"
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
                  ● Proceso aprobado · Firma disponible
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

                <p style="margin:0 0 12px;text-align:center;font-size:26px;font-weight:800;color:#0f172a;">
                  Datos aprobados correctamente
                </p>

                <p style="margin:0 0 16px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Hola <strong>${escHtml(clienteNombre)}</strong>,
                </p>

                <p style="margin:0 0 18px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Hemos revisado tu información y te confirmamos que
                  <strong>todos los pasos previos fueron aprobados correctamente</strong>.
                </p>

                <p style="margin:0 0 26px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Ahora puedes continuar con el proceso final:  
                  <strong>validar tu identidad y firmar tu contrato de forma digital.</strong>
                </p>

                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f8fbff;border:1px solid #dbe7ff;border-radius:18px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2563eb;">
                        ¿Qué debes hacer ahora?
                      </p>

                      <ol style="margin:0;padding-left:18px;color:#4b5b7c;font-size:14px;line-height:1.7;">
                        <li>Ingresa al portal de usuario en: <strong>www.dimcultura.com</strong>.</li>
                        <li>Ingresa al portal de usuario o haz clic en el link: <strong>https://dimcultura.com/auth</strong>.</li>
                        <li>Busca tu contrato.</li>
                        <li>Valida tu identidad y firma el contrato.</li>
                      </ol>
                    </td>
                  </tr>
                </table>

                <div style="text-align:center;margin-bottom:26px;">
                  <a href="${portalUrl}"
                    style="display:inline-block;padding:14px 26px;background:#2563eb;
                    color:#ffffff !important;text-decoration:none;font-weight:700;border-radius:999px;
                    font-size:14px;box-shadow:0 6px 18px rgba(37,99,235,0.25);">
                    Ir al portal y firmar
                  </a>
                </div>

                <p style="margin:0 0 20px;text-align:center;font-size:13px;line-height:1.7;color:#64748b;">
                  Puedes completar la firma en cualquier momento desde tu panel.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0"
                  style="margin-top:20px;border-top:1px solid #edf2fb;">
                  <tr>
                    <td style="padding-top:18px;text-align:center;">
                      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">
                        ${template.nombre}
                      </p>

                      <p style="margin:0;font-size:12px;color:#64748b;">
                        ${template.email} · ${template.web}
                      </p>

                      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">
                        NIT ${template.nit} · "${template.slogan}"
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
  `;

  return await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}