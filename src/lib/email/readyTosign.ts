import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);


interface SendReadyToSignEmailParams {
    to: string;
    clienteNombre: string;
    portalLink: string;
}

export async function sendReadyToSignEmail({
    to,
    clienteNombre,
    portalLink,
}: SendReadyToSignEmailParams) {
    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

    const response = await resend.emails.send({
        from,
        to,
        subject: `✅ Tus documentos fueron aprobados — Dimcultura S.A.S`,
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
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:inline-block;width:56px;height:56px;border-radius:50%;
                background:#e8f5ee;line-height:56px;font-size:26px;">📋</div>
            </div>
            <p style="color:#1a1a2e;font-size:16px;font-weight:700;text-align:center;margin:0 0 8px;">
              ¡Tus documentos fueron aprobados!
            </p>
            <p style="color:#4a4a6a;font-size:14px;line-height:1.7;margin:0 0 8px;text-align:center;">
              Hola <strong>${clienteNombre}</strong>,
            </p>
            <p style="color:#4a4a6a;font-size:14px;line-height:1.7;margin:0 0 24px;text-align:center;">
              Hemos revisado y aprobado todos tus documentos. Tu libranza está 
              <strong>listo para ser firmado</strong>. Ingresa al portal para completar el proceso.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:#1a1a2e;border-radius:10px;">
                  <a href="${portalLink}"
                    style="display:inline-block;padding:14px 32px;color:#c9a84c;
                      font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                    ✍️ &nbsp; Ir a firmar mi contrato
                  </a>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f5f0e8;border-radius:10px;border-left:4px solid #c9a84c;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-size:11px;color:#7a6e5f;margin:0 0 4px;font-weight:700;
                    text-transform:uppercase;letter-spacing:1px;">¿El botón no funciona?</p>
                  <p style="font-size:11px;color:#7a6e5f;margin:0;word-break:break-all;">
                    <a href="${portalLink}" style="color:#a07830;">${portalLink}</a>
                  </p>
                  <p style="color:#4a4a6a;font-size:14px;line-height:1.7;margin:0 0 24px;text-align:center;">
                    Para acceder al portal ingresa con tu correo electrónico, te enviaremos 
                    un código de verificación para confirmar tu identidad y podrás firmar tu contrato.
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