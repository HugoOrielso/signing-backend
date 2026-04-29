// services/sms.service.ts
import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

function formatToE164(to: string) {
    const digits = to.replace(/\D/g, "");
    return `+57${digits}`;
}

export function normalizeColombianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  // Caso 1: ya viene local
  if (digits.length === 10 && digits.startsWith("3")) {
    return digits;
  }

  // Caso 2: viene con prefijo país 57
  if (digits.length === 12 && digits.startsWith("57")) {
    const local = digits.slice(2);

    if (local.length === 10 && local.startsWith("3")) {
      return local;
    }
  }

  return null;
}

export function toMasivColombianPhone(input: string): string | null {
  const local = normalizeColombianPhone(input);
  if (!local) return null;
  return `57${local}`;
}

export function toTwilioColombianPhone(input: string): string | null {
  const local = normalizeColombianPhone(input);
  if (!local) return null;
  return `+57${local}`;
}



export async function sendSms(to: string, body: string) {
    try {
        return client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: (to),
            body,
        });
        
    } catch (error) {
    }
}