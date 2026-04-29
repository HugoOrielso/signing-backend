import { Resend } from "resend";
import { getTemplateConfig, TemplateKey } from "./templateConfig";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReadyToSignEmailParams {
  to: string;
  clienteNombre: string;
  templateKey?: TemplateKey | string | null;
}

export async function sendReadyToSignEmail({
  to,
  clienteNombre,
  templateKey,
}: SendReadyToSignEmailParams) {
  const template = getTemplateConfig(templateKey);

  const from =
    process.env.EMAIL_FROM || `${template.nombre} <contact@send.dimcultura.com>`;

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject: `✅ Documentos aprobados — ${template.nombre}`,
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

<img src="${template.logoFile}"
width="110"
style="display:block;margin:0 auto 10px;" />

<p style="margin:0;font-size:18px;color:#0f172a;font-weight:700;">
${template.nombre}
</p>

<p style="margin:4px 0 0;font-size:12px;color:#64748b;">
${template.subtitulo}
</p>

<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">
NIT ${template.nit}
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
✅
</div>

</td>
</tr>

<!-- CONTENT -->
<tr>
<td style="background:linear-gradient(135deg,#e0f2fe,#f8fbff);
padding:0 32px 32px;">

<p style="color:#0f172a;font-size:22px;font-weight:700;text-align:center;margin:0 0 8px;">
¡Tus documentos fueron aprobados!
</p>

<p style="color:#475569;font-size:14px;line-height:1.7;text-align:center;margin:0 0 16px;">
Hola <strong>${clienteNombre}</strong>, hemos validado correctamente los documentos que enviaste.
</p>

<p style="color:#475569;font-size:14px;line-height:1.7;text-align:center;margin:0 0 20px;">
Este proceso se realiza en <strong>dos etapas</strong>:
</p>

<p style="color:#475569;font-size:13px;line-height:1.7;text-align:center;margin:0 0 6px;">
<strong style="color:#2563eb;">1.</strong> Validación de documentos ✅ (completado)
</p>

<p style="color:#475569;font-size:13px;line-height:1.7;text-align:center;margin:0 0 16px;">
<strong style="color:#2563eb;">2.</strong> Confirmación de datos personales (siguiente paso)
</p>

</td>
</tr>

<!-- INFO -->
<tr>
<td style="padding:24px 32px;">
<p style="color:#475569;font-size:13px;line-height:1.7;text-align:center;margin:0;">
Este paso es necesario para garantizar la seguridad y la correcta validación de tu información.
Te recomendamos estar atento a tu bandeja de entrada.
</p>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e8edf2;">
<p style="color:#94a3b8;font-size:11px;margin:0;">
© 2025 ${template.nombre} · NIT ${template.nit}<br />
<span style="font-style:italic;">"${template.slogan}"</span>
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
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    throw error;
  }
}