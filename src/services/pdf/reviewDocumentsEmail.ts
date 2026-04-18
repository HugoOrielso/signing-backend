import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
type SendUserDataRejectedEmailParams = {
  to: string;
  clienteNombre: string;
  notes: string;
};

export async function sendUserDataRejectedEmail({
  to,
  clienteNombre,
  notes,
}: SendUserDataRejectedEmailParams) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const subject = "⚠️ Tus datos fueron rechazados — acción requerida";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">Hola ${clienteNombre},</h2>

      <p>
        Hemos revisado la información enviada para tu proceso de libranza, pero
        <strong>los datos fueron rechazados</strong>.
      </p>

      <p>
        Por favor revisa cuidadosamente las observaciones del equipo y realiza las correcciones necesarias.
      </p>

      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 14px; margin: 20px 0; border-radius: 8px;">
        <strong>Observaciones:</strong>
        <p style="margin: 8px 0 0 0;">${notes}</p>
      </div>

      <p>
        Una vez corregida la información, vuelve a actualizar tus datos para continuar con el proceso.
      </p>

      <p style="margin-top: 24px;">
        Quedamos atentos.
      </p>

      <p>
        <strong>Dimcultura S.A.S</strong>
      </p>
    </div>
  `;

  return await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}



type SendUserDataApprovedEmailParams = {
  to: string;
  clienteNombre: string;
};

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
}: SendUserDataApprovedEmailParams) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const subject = "✅ Tus datos fueron aprobados — ya puedes firmar";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">Hola ${escHtml(clienteNombre)},</h2>

      <p>
        Hemos revisado tu información y te confirmamos que
        <strong>todos los pasos previos fueron aprobados correctamente</strong>.
      </p>

      <p>
        Ya puedes continuar con el proceso de firma de tu libranza.
      </p>

      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px; margin: 20px 0; border-radius: 8px;">
        <strong>¿Qué debes hacer ahora?</strong>
        <ol style="margin: 10px 0 0 18px; padding: 0;">
          <li>Ingresa a tu panel.</li>
          <li>Busca el contrato correspondiente.</li>
          <li>Haz clic en <strong>Firmar</strong>.</li>
        </ol>
      </div>

      <p>
        Si ya estás dentro del sistema, puedes continuar cuando quieras.
      </p>

      <p style="margin-top: 24px;">
        <strong>Dimcultura S.A.S</strong>
      </p>
    </div>
  `;

  return await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}