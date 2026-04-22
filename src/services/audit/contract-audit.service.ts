import { AdminRole, AuditActorType, AuditEventType } from "../../generated/prisma/enums";
import { logAuditEvent, shouldSkipDuplicateAuditEvent } from "./audit.service";

type AuditContext = {
  adminId?: string | null;
  actorRole?: AdminRole | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
};

type TrackContractCreatedInput = AuditContext & {
  contractId: string;
  title: string;
  contractType: string;
  contractNumber: string | null;
  signerCount: number;
  hasLibranza: boolean;
  format: "new" | "legacy";
  templateKey: string;
};

type TrackContractSentInput = AuditContext & {
  contractId: string;
  sendTo: string | null;
  clienteNombre: string | null;
  signingLink: string;
  tokenExpiresAt: Date;
  templateKey: string;
};

export async function trackContractCreated(input: TrackContractCreatedInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.CONTRACT_CREATED,
    actorType: AuditActorType.ADMIN,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      title: input.title,
      contractType: input.contractType,
      contractNumber: input.contractNumber,
      signerCount: input.signerCount,
      hasLibranza: input.hasLibranza,
      format: input.format,
      templateKey: input.templateKey,
    },
  });
}

export async function trackContractSent(input: TrackContractSentInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.CONTRACT_SENT,
    actorType: AuditActorType.ADMIN,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      sendTo: input.sendTo,
      clienteNombre: input.clienteNombre,
      signingLink: input.signingLink,
      tokenExpiresAt: input.tokenExpiresAt.toISOString(),
      emailSentPlanned: !!input.sendTo,
      templateKey: input.templateKey,
    },
  });
}


type TrackEmailInput = AuditContext & {
  contractId: string;
  to: string | null;
  templateKey?: string | null;
  provider?: string | null;
  errorMessage?: string | null;
};

export async function trackEmailSendRequested(input: TrackEmailInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.EMAIL_SEND_REQUESTED,
    actorType: AuditActorType.SYSTEM,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      to: input.to,
      templateKey: input.templateKey ?? null,
      provider: input.provider ?? null,
    },
  });
}

export async function trackEmailSent(input: TrackEmailInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.EMAIL_SENT,
    actorType: AuditActorType.SYSTEM,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      to: input.to,
      templateKey: input.templateKey ?? null,
      provider: input.provider ?? null,
    },
  });
}

export async function trackEmailFailed(input: TrackEmailInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.EMAIL_FAILED,
    actorType: AuditActorType.SYSTEM,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      to: input.to,
      templateKey: input.templateKey ?? null,
      provider: input.provider ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  });
}


type BaseSignerAuditContext = {
  contractId: string;
  signerId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
};

type TrackLinkOpenedInput = BaseSignerAuditContext & {
  contractStatus: string;
  contractType: string;
  signerCount: number;
  hasLibranza: boolean;
};

export async function trackContractLinkOpened(input: TrackLinkOpenedInput) {
  const shouldSkip = await shouldSkipDuplicateAuditEvent({
    contractId: input.contractId,
    eventType: AuditEventType.LINK_OPENED,
    signerId: input.signerId ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    sessionId: input.sessionId ?? null,
    withinSeconds: 5 * 60, // 5 minutos
  });

  if (shouldSkip) {
    return null;
  }

  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: AuditEventType.LINK_OPENED,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      contractStatus: input.contractStatus,
      contractType: input.contractType,
      signerCount: input.signerCount,
      hasLibranza: input.hasLibranza,
    },
  });
}

type TrackContractViewedInput = BaseSignerAuditContext & {
  previousStatus: string;
  currentStatus: string;
};

export async function trackContractViewed(input: TrackContractViewedInput) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: AuditEventType.CONTRACT_UPDATED,
    actorType: AuditActorType.SYSTEM,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      action: "STATUS_CHANGED_TO_VIEWED",
      previousStatus: input.previousStatus,
      currentStatus: input.currentStatus,
    },
  });
}

export async function trackContractSigned(input: {
  contractId: string;
  signerId: string;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  signatureId: string;
  signatureType: "TYPED" | "DRAWN";
  otpVerified: boolean;
  documentHash: string;
  signedAt: string;
  signerOrder: number;
  previousStatus: string;
}) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId,
    eventType: AuditEventType.CONTRACT_SIGNED,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    documentHash: input.documentHash,
    metadata: {
      signatureId: input.signatureId,
      signatureType: input.signatureType,
      otpVerified: input.otpVerified,
      signedAt: input.signedAt,
      signerOrder: input.signerOrder,
      previousStatus: input.previousStatus,
    },
  });
}

export async function trackContractStatusChange(input: {
  contractId: string;
  signerId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  previousStatus: string;
  newStatus: string;
  allSigned: boolean;
  totalSigners: number;
  signedSigners: number;
}) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: AuditEventType.SIGNATURE_COMPLETED,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      allSigned: input.allSigned,
      totalSigners: input.totalSigners,
      signedSigners: input.signedSigners,
    },
  });
}

type BaseOtpAuditInput = {
  contractId: string;
  signerId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
};

export async function trackOtpSent(input: BaseOtpAuditInput & {
  contractStatus: string;
}) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: AuditEventType.OTP_SENT,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      contractStatus: input.contractStatus,
    },
  });
}

export async function trackOtpVerified(input: BaseOtpAuditInput) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: AuditEventType.OTP_VERIFIED,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: null,
  });
}




type TrackReviewInput = AuditContext & {
  contractId: string;
  target: "DOCUMENT" | "USER_DATA";
  status: "APPROVED" | "REJECTED";
  notes?: string | null;
  documentType?: string; // Solo si es DOCUMENT
};

export async function trackReviewAction(input: TrackReviewInput) {
  return logAuditEvent({
    contractId: input.contractId,
    adminId: input.adminId ?? null,
    eventType: AuditEventType.CONTRACT_UPDATED, 
    actorType: AuditActorType.CREDIT_ANALYST,
    actorRole: input.actorRole ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: {
      action: input.target === "DOCUMENT" ? "DOCUMENT_REVIEWED" : "DATA_REVIEWED",
      status: input.status,
      notes: input.notes,
      documentType: input.documentType,
    },
  });
}


export async function trackPublicOtpSent(input: {
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
  email?: string | null;
  phone?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
}) {
  return logAuditEvent({
    contractId: 'PUBLIC_OTP',
    signerId: null,
    eventType: AuditEventType.OTP_SENT,
    actorType: AuditActorType.SIGNER,
    actorName: null,
    actorEmail: input.email ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    metadata: {
      action: "PUBLIC_OTP_SENT",
      identifier: input.identifier,
      identifierType: input.identifierType,
      phone: input.phone ?? null,
    },
  });
}


type TrackPagareSignedInput = {
  contractId: string;
  pagareId: string;
  pagareNumber: number;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  signatureType: "TYPED" | "DRAWN";
  signedAt: string;
  documentHash: string;
  imageUrl?: string | null;
};

export async function trackPagareSigned(input: TrackPagareSignedInput) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: null,
    eventType: AuditEventType.CONTRACT_UPDATED,
    actorType: AuditActorType.SIGNER,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    documentHash: input.documentHash,
    metadata: {
      action: "PAGARE_SIGNED",
      pagareId: input.pagareId,
      pagareNumber: input.pagareNumber,
      signatureType: input.signatureType,
      signedAt: input.signedAt,
      hasDrawnSignature: input.signatureType === "DRAWN",
      imageUrl: input.imageUrl ?? null,
    },
  });
}