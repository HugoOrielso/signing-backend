// src/services/masiv.service.ts

export async function sendMasiveSMS(to: string, text: string) {
  const USER = process.env.MASIV_USER;
  const PASSWORD = process.env.MASIV_PASSWORD;

  if (!USER || !PASSWORD) {
    throw new Error("Credenciales de Masiv no configuradas");
  }

  const auth = Buffer.from(`${USER}:${PASSWORD}`).toString("base64");

  const response = await fetch(process.env.MASIV_ENDPOINT as string, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Error Masiv: ${JSON.stringify(data)}`);
  }

  return data;
}