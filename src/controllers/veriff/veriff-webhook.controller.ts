// src/controllers/veriff/veriff-webhook.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../database/db";
import {
  createVeriffSignatureFromRawBody,
  parseRawJson,
  safeCompareHex,
} from "../../helpers/veriff-webhook";

const VERIFF_WEBHOOK_SECRET = process.env.VERIFF_WEBHOOK_SECRET || "";

type IdentityStatus =
  | "PENDING_PROVIDER"
  | "STARTED"
  | "SUBMITTED"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "MANUAL_REVIEW"
  | "EXPIRED"
  | "ABANDONED"
  | "ERROR";

type VeriffEventPayload = {
  id?: string;
  attemptId?: string;
  feature?: string;
  action?: string;
  code?: number | string;
  vendorData?: string;
  endUserId?: string;
  createdAt?: string;
};

type VeriffDecisionPayload = {
  status?: string;
  verification?: {
    id?: string;
    attemptId?: string;
    status?: string;
    code?: number | string;
    reason?: string | null;
    reasonCode?: number | string | null;
    vendorData?: string | null;
    endUserId?: string | null;
    person?: {
      firstName?: string | null;
      lastName?: string | null;
      idNumber?: string | null;
    } | null;
    document?: {
      number?: string | null;
      type?: string | null;
      country?: string | null;
    } | null;
  };
  technicalData?: {
    ip?: string;
  };
};

const STATUS_PRIORITY: Record<IdentityStatus, number> = {
  PENDING_PROVIDER: 0,
  STARTED: 1,
  SUBMITTED: 2,
  PROCESSING: 3,
  MANUAL_REVIEW: 4,
  APPROVED: 5,
  REJECTED: 5,
  EXPIRED: 5,
  ABANDONED: 5,
  ERROR: 5,
};

const TERMINAL_STATUSES: IdentityStatus[] = [
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "ABANDONED",
  "ERROR",
];

function getRawBody(req: Request): Buffer {
  if (!Buffer.isBuffer(req.body)) {
    throw new Error("Veriff webhook body is not a raw Buffer");
  }

  return req.body;
}

function verifyVeriffSignature(req: Request, rawBody: Buffer) {
  const receivedSignature = String(
    req.header("x-hmac-signature") || ""
  )
    .trim()
    .toLowerCase();

  if (!receivedSignature || !VERIFF_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = createVeriffSignatureFromRawBody(
    rawBody,
    VERIFF_WEBHOOK_SECRET
  );

  return safeCompareHex(receivedSignature, expectedSignature);
}

function mapEventStatusToIdentityStatus(action?: string): IdentityStatus {
  switch ((action || "").toLowerCase()) {
    case "started":
      return "STARTED";
    case "submitted":
      return "SUBMITTED";
    default:
      return "PROCESSING";
  }
}

function mapDecisionStatusToIdentityStatus(status?: string): IdentityStatus {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return "APPROVED";
    case "declined":
      return "REJECTED";
    case "resubmission_requested":
      return "MANUAL_REVIEW";
    case "expired":
      return "EXPIRED";
    case "abandoned":
      return "ABANDONED";
    default:
      return "ERROR";
  }
}

function shouldUpdateStatus(currentStatus: string, nextStatus: IdentityStatus) {
  const current = currentStatus as IdentityStatus;

  if (TERMINAL_STATUSES.includes(current)) {
    return false;
  }

  return STATUS_PRIORITY[nextStatus] >= (STATUS_PRIORITY[current] ?? 0);
}

async function findIdentityVerificationForWebhook(params: {
  sessionId?: string | null;
  vendorData?: string | null;
  endUserId?: string | null;
}) {
  const { sessionId, vendorData, endUserId } = params;

  if (vendorData) {
    const byVendorData = await prisma.identityVerification.findFirst({
      where: { vendorData },
    });

    if (byVendorData) return byVendorData;
  }

  if (endUserId) {
    const byEndUserId = await prisma.identityVerification.findFirst({
      where: { endUserId },
    });

    if (byEndUserId) return byEndUserId;
  }

  if (sessionId) {
    const bySession = await prisma.identityVerification.findFirst({
      where: {
        OR: [
          { providerRequestId: sessionId },
          { providerReference: sessionId },
        ],
      },
    });

    if (bySession) return bySession;
  }

  return null;
}

export async function veriffEventWebhook(req: Request, res: Response) {
  try {
    const rawBody = getRawBody(req);

    console.log("Received Veriff event webhook with body:", rawBody.toString());

    if (!verifyVeriffSignature(req, rawBody)) {
      return res.status(401).json({
        ok: false,
        message: "Invalid Veriff signature",
      });
    }

    const payload = parseRawJson<VeriffEventPayload>(rawBody);

    const sessionId = payload.id ?? null;
    const vendorData = payload.vendorData ?? null;
    const endUserId = payload.endUserId ?? null;
    const providerStatus = payload.action ?? null;

    const identityVerification = await findIdentityVerificationForWebhook({
      sessionId,
      vendorData,
      endUserId,
    });

    if (!identityVerification) {
      console.log("Identity verification not found for event webhook", {
        sessionId,
        vendorData,
        endUserId,
      });

      return res.status(404).json({
        ok: false,
        message: "Identity verification not found",
      });
    }

    const nextStatus = mapEventStatusToIdentityStatus(providerStatus ?? "");

    if (!shouldUpdateStatus(identityVerification.status, nextStatus)) {
      console.log("Skipping Veriff event status downgrade", {
        currentStatus: identityVerification.status,
        nextStatus,
        providerStatus,
      });

      return res.status(200).json({
        ok: true,
        skipped: true,
        currentStatus: identityVerification.status,
      });
    }

    const updated = await prisma.identityVerification.update({
      where: { id: identityVerification.id },
      data: {
        status: nextStatus as any,
        providerStatus,
        providerReference:
          identityVerification.providerReference || sessionId || undefined,
        providerRequestId:
          identityVerification.providerRequestId || sessionId || undefined,
        notes: JSON.stringify({
          type: "event",
          payload,
        }),
        submittedAt:
          nextStatus === "SUBMITTED"
            ? new Date()
            : identityVerification.submittedAt,
      },
    });

    console.log("Veriff event updated status:", updated.status);

    return res.status(200).json({
      ok: true,
      status: updated.status,
    });
  } catch (error) {
    console.error("veriffEventWebhook error:", error);

    return res.status(500).json({
      ok: false,
      message: "Webhook processing failed",
    });
  }
}

export async function veriffDecisionWebhook(req: Request, res: Response) {
  try {
    const rawBody = getRawBody(req);

    console.log(
      "Received Veriff decision webhook with body:",
      rawBody.toString()
    );

    if (!verifyVeriffSignature(req, rawBody)) {
      return res.status(401).json({
        ok: false,
        message: "Invalid Veriff signature",
      });
    }

    const payload = parseRawJson<VeriffDecisionPayload>(rawBody);
    const verification = payload.verification ?? {};

    const sessionId = verification.id ?? null;
    const vendorData = verification.vendorData ?? null;
    const endUserId = verification.endUserId ?? null;
    const providerStatus = verification.status ?? null;
    const providerCode =
      verification.code !== undefined && verification.code !== null
        ? String(verification.code)
        : null;

    const rejectionReason = verification.reason ?? null;

    const identityVerification = await findIdentityVerificationForWebhook({
      sessionId,
      vendorData,
      endUserId,
    });

    if (!identityVerification) {
      console.log("Identity verification not found for decision webhook", {
        sessionId,
        vendorData,
        endUserId,
      });

      return res.status(404).json({
        ok: false,
        message: "Identity verification not found",
      });
    }

    const nextStatus = mapDecisionStatusToIdentityStatus(providerStatus ?? "");

    const fullName =
      [verification.person?.firstName, verification.person?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || identityVerification.fullName;

    const documentNumber =
      verification.document?.number ||
      verification.person?.idNumber ||
      identityVerification.documentNumber;

    const updated = await prisma.identityVerification.update({
      where: { id: identityVerification.id },
      data: {
        status: nextStatus as any,
        providerStatus: providerCode
          ? `${providerStatus}:${providerCode}`
          : providerStatus,
        providerReference: sessionId || identityVerification.providerReference,
        providerRequestId: sessionId || identityVerification.providerRequestId,
        rejectionReason,
        documentNumber,
        fullName,
        notes: JSON.stringify({
          type: "decision",
          payload,
        }),
      },
    });

    console.log("Veriff decision updated status:", updated.status);

    return res.status(200).json({
      ok: true,
      status: updated.status,
    });
  } catch (error) {
    console.error("veriffDecisionWebhook error:", error);

    return res.status(500).json({
      ok: false,
      message: "Webhook processing failed",
    });
  }
}