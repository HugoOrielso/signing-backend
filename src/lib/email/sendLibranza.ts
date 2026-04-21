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
  const from = process.env.EMAIL_FROM || "Dimcultura <contact@dimcultura.com>";

  const response = await resend.emails.send({
    from,
    to,
    subject: `Dimcultura S.A.S — Tu libranza está lista para firmar`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="580" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:20px;overflow:hidden;
box-shadow:0 10px 40px rgba(37,99,235,0.12);">

<!-- HEADER -->
<tr>
<td style="padding:28px 32px 16px;text-align:center;border-bottom:1px solid #eef2f7;">

<img src="https://dimcultura.com/assets/logo_dimcultura.png"
width="120"
style="display:block;margin:0 auto 8px;" />

<p style="margin:0;font-size:11px;color:#64748b;letter-spacing:1.5px;
text-transform:uppercase;font-weight:600;">
Servicios Digitales
</p>

</td>
</tr>

<!-- ICON -->
<tr>
<td style="background:linear-gradient(135deg,#e0f2fe,#f8fbff);
padding:24px 32px 0;text-align:center;">

<div style="
display:inline-block;
width:64px;height:64px;
border-radius:16px;
background:white;
box-shadow:0 6px 18px rgba(37,99,235,0.2);
line-height:64px;
font-size:28px;
margin-bottom:16px;
">
✍️
</div>

</td>
</tr>

<!-- CONTENT -->
<tr>
<td style="background:linear-gradient(135deg,#e0f2fe,#f8fbff);
padding:0 32px 32px;">

<p style="font-size:15px;color:#0f172a;margin:0 0 16px;text-align:center;">
Hola, <strong>${clienteNombre}</strong>
</p>

<p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;text-align:center;">
${asesor ? `<strong>${asesor}</strong> de` : "El equipo de"} <strong>Dimcultura</strong>
ha preparado tu <strong>libranza</strong> y ya está lista para que la revises y firmes digitalmente.
</p>

<!-- BLOQUE OTP -->
<table width="100%" cellpadding="0" cellspacing="0"
style="background:white;border-radius:12px;border-left:4px solid #2563eb;margin-bottom:28px;">
<tr>
<td style="padding:20px 20px;">
<p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 10px;">
🔐 Verificación de identidad
</p>

<p style="font-size:13px;color:#475569;line-height:1.7;margin:0 0 10px;">
Antes de firmar, deberás verificar tu identidad con un
<strong>código de un solo uso (OTP)</strong>.
</p>

<p style="font-size:13px;color:#475569;margin:0 0 10px;">
El código será enviado a:
</p>

<p style="font-size:14px;font-weight:700;color:#2563eb;margin:0;">
📧 ${to}
</p>

<p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">
Este proceso protege tu firma digital conforme a la normativa colombiana.
</p>
</td>
</tr>
</table>

<p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 28px;text-align:center;">
Cuando estés listo, haz clic en el botón y sigue los pasos para completar el proceso.
</p>

<!-- BOTÓN -->
<table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
<tr>
<td style="
background:linear-gradient(135deg,#2563eb,#3b82f6);
border-radius:12px;
box-shadow:0 6px 18px rgba(37,99,235,0.35);
">
<a href="${signingLink}"
style="
display:inline-block;
padding:14px 36px;
color:white;
font-size:14px;
font-weight:700;
text-decoration:none;
">
Revisar y firmar libranza
</a>
</td>
</tr>
</table>

<!-- PASOS -->
<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f1f5f9;border-radius:12px;margin-bottom:28px;">
<tr>
<td style="padding:20px;">
<p style="font-size:12px;font-weight:700;color:#0f172a;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">
Cómo completar el proceso
</p>

<p style="font-size:13px;color:#475569;margin:0 0 10px;">
<strong>1.</strong> Ingresa con tu correo (${to})
</p>

<p style="font-size:13px;color:#475569;margin:0 0 10px;">
<strong>2.</strong> Recibe tu código de verificación
</p>

<p style="font-size:13px;color:#475569;margin:0;">
<strong>3.</strong> Revisa y firma tu documento
</p>

</td>
</tr>
</table>

<!-- FALLBACK -->
<table width="100%" cellpadding="0" cellspacing="0"
style="background:white;border-radius:10px;border-left:4px solid #2563eb;margin-bottom:20px;">
<tr>
<td style="padding:14px;">
<p style="font-size:11px;color:#64748b;margin:0 0 4px;font-weight:700;text-transform:uppercase;">
¿El botón no funciona?
</p>
<p style="font-size:11px;color:#64748b;margin:0;word-break:break-all;">
<a href="${signingLink}" style="color:#2563eb;">${signingLink}</a>
</p>
</td>
</tr>
</table>

<p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
Este enlace es válido por 30 días.
</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e8edf2;">
<p style="font-size:11px;color:#94a3b8;margin:0;">
Dimcultura S.A.S · servicioalcliente@dimcultura.com · www.dimcultura.com
</p>
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

  return response;
}