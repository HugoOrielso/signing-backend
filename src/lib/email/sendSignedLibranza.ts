import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSignedEmailParams {
  to: string;
  clienteNombre: string;
  pdfBuffer: Buffer;
  fileName: string;
  role: "cliente" | "admin";
  certBuffer?: Buffer;
  certFileName?: string;
}

export async function sendSignedContractEmail({
  to,
  clienteNombre,
  pdfBuffer,
  fileName,
  role,
  certBuffer,
  certFileName,
}: SendSignedEmailParams) {
  const from = process.env.EMAIL_FROM || "Dimcultura <contact@dimcultura.com>";

  const isAdmin = role === "admin";
  const subject = isAdmin
    ? `✅ Libranza firmada — ${clienteNombre}`
    : `✅ Tu libranza ha sido firmada — Dimcultura S.A.S`;

  const bodyTitle = isAdmin
    ? `La libranza de <strong>${clienteNombre}</strong> fue firmada correctamente.`
    : `Hola <strong>${clienteNombre}</strong>, tu libranza ha sido firmada y registrada correctamente.`;

  const passwordNote = !isAdmin
    ? `<table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f8fbff;border:1px solid #dbe7ff;border-radius:18px;margin-bottom:20px;">
          <tr>
            <td style="padding:16px 18px;">
              <p style="font-size:11px;color:#2563eb;margin:0 0 6px;font-weight:700;
                text-transform:uppercase;letter-spacing:1px;">🔒 Documento protegido</p>
              <p style="font-size:13px;color:#4b5b7c;line-height:1.6;margin:0;">
                El PDF adjunto está protegido con contraseña.
                Para abrirlo usa tu número de cédula.
              </p>
            </td>
          </tr>
        </table>`
    : "";

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
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0"
            style="width:620px;max-width:620px;background:#ffffff;border:1px solid #e5edf8;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(37,99,235,0.08);">
            
            <tr>
              <td style="padding:28px 32px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border-bottom:1px solid #edf2fb;text-align:center;">
                <img
                  src="https://dimcultura.com/assets/logo_dimcultura.png"
                  alt="Dimcultura"
                  style="max-width:220px;width:220px;height:auto;display:block;margin:0 auto 18px auto;"
                />
                <div style="display:inline-block;background:#f1f6ff;border:1px solid #d9e6ff;color:#2563eb;
                  font-size:13px;font-weight:500;line-height:1;padding:10px 16px;border-radius:999px;">
                  ● Gestión documental · Libranzas · Pagarés digitales
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 34px;">
                <div style="text-align:center;margin-bottom:22px;">
                  <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;
                    background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);font-size:28px;border:1px solid #cfe0ff;">
                    ✅
                  </div>
                </div>

                <p style="margin:0 0 12px;text-align:center;font-size:30px;line-height:1.2;font-weight:800;color:#0f172a;">
                  Libranza firmada correctamente
                </p>

                <p style="margin:0 0 14px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  ${bodyTitle}
                </p>

                <p style="margin:0 0 26px;text-align:center;font-size:15px;line-height:1.8;color:#4b5b7c;">
                  Encuentra el contrato firmado adjunto en este correo.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:1px solid #e3ecfb;border-radius:22px;margin-bottom:22px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2563eb;">
                        Estado del proceso
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                        El documento ya fue firmado y quedó registrado correctamente en el sistema de Dimcultura.
                      </p>
                    </td>
                  </tr>
                </table>

                ${passwordNote}
                ${certNote}

                <table width="100%" cellpadding="0" cellspacing="0"
                  style="margin-top:28px;border-top:1px solid #edf2fb;">
                  <tr>
                    <td style="padding-top:20px;text-align:center;">
                      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">
                        Dimcultura S.A.S
                      </p>
                      <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                        NIT. 900.585.322-4 · servicioalcliente@dimcultura.com · www.dimcultura.com
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