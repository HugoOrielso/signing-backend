// services/sms.service.ts
import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

function formatToE164(to: string) {
    const digits = to.replace(/\D/g, "");
    return `+${digits}`;
}

export async function sendSms(to: string, body: string) {
    try {
        return client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: formatToE164(to),
            body,
        });
        
    } catch (error) {
    }
}