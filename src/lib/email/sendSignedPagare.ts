import { Resend } from "resend";
import { getTemplateConfig, TemplateKey } from "./templateConfig";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSignedEmailParams {
  to: string;
  clienteNombre: string;
  pdfBuffer: Buffer;
  fileName: string;
  role: "cliente" | "admin";
  certBuffer?: Buffer;
  certFileName?: string;
  templateKey: TemplateKey;
}

export async function sendSignedPagareEmail({
  to,
  clienteNombre,
  pdfBuffer,
  fileName,
  role,
  certBuffer,
  certFileName,
  templateKey,
}: SendSignedEmailParams) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@dimcultura.com>`;

  const isAdmin = role === "admin";

  const subject = isAdmin
    ? `✅ Pagaré firmado — ${clienteNombre}`
    : `✅ Tu pagaré ha sido firmado — ${template.nombre}`;

  const bodyTitle = isAdmin
    ? `El pagaré de <strong>${clienteNombre}</strong> fue firmado correctamente.`
    : `Hola <strong>${clienteNombre}</strong>, tu pagaré ha sido firmado y registrado correctamente.`;

  const certNote = certBuffer
    ? `<table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f8fbff;border:1px solid #dbe7ff;border-radius:18px;margin-bottom:20px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="font-size:11px;color:#2563eb;margin:0 0 6px;font-weight:700;
              text-transform:uppercase;letter-spacing:1px;">📄 Certificado de firma</p>
            <p style="font-size:13px;color:#4b5b7c;line-height:1.6;margin:0;">
              Se adjunta también el certificado de firma electrónica con el registro
              de hash, IP y fecha de firma para tu constancia.
            </p>
          </td>
        </tr>
      </table>`
    : "";

  return resend.emails.send({
    from,
    to,
    subject,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
      },
      ...(certBuffer && certFileName
        ? [{ filename: certFileName, content: certBuffer }]
        : []),
    ],
    html: `
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
                ● Pagaré firmado · Documento disponible
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
                Pagaré firmado correctamente
              </p>

              <p style="margin:0 0 16px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                ${bodyTitle}
              </p>

              <p style="margin:0 0 24px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                Encuentra el pagaré firmado adjunto en este correo.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:1px solid #e3ecfb;border-radius:22px;margin-bottom:22px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2563eb;">
                      Estado del proceso
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                      El pagaré ya fue firmado y quedó registrado correctamente en el sistema de ${template.nombre}.
                    </p>
                  </td>
                </tr>
              </table>

              ${certNote}

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
</html>`,
  });
}