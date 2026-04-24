// src/services/veriff/veriff.service.ts
import axios from "axios";
import { createVeriffSignature } from "../../helpers/veriffSession";

const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL!;
const VERIFF_API_KEY = process.env.VERIFF_API_KEY!;
const VERIFF_SHARED_SECRET = process.env.VERIFF_SHARED_SECRET!;

type CreateVeriffSessionInput = {
    contractId: string;
    callbackUrl?: string;
    firstName?: string;
    lastName?: string;
    idNumber?: string;
    documentNumber?: string;
    documentType?: string; // PASSPORT, ID_CARD, etc según tu configuración
    documentCountry?: string; // CO, etc
    endUserId?: string;
};

export async function createVeriffSession(input: CreateVeriffSessionInput) {
    const payload = {
        verification: {
            callback: input.callbackUrl,
            vendorData: input.contractId,
            endUserId: input.endUserId ?? input.contractId,
            person: input.firstName || input.lastName || input.idNumber
                ? {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    idNumber: input.idNumber,
                }
                : undefined,
            document:
                input.documentNumber || input.documentType || input.documentCountry
                    ? {
                        number: input.documentNumber,
                        type: input.documentType,
                        country: input.documentCountry,
                    }
                    : undefined,
        },
    };

    console.log("createVeriffSession payload:", payload); // Log del payload para depuración
    const rawBody = JSON.stringify(payload);
    const signature = createVeriffSignature(rawBody, VERIFF_SHARED_SECRET);

    const response = await axios.post(
        `${VERIFF_BASE_URL}/v1/sessions`,
        rawBody,
        {
            headers: {
                "Content-Type": "application/json",
                "X-AUTH-CLIENT": VERIFF_API_KEY,
                "X-HMAC-SIGNATURE": signature,
            },
            timeout: 30000,
        }
    );

    return response.data;
}