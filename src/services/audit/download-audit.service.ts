import {  AuditActorType, AuditEventType, ContractDocumentType } from "../../generated/prisma/enums";
import { logAuditEvent } from "./audit.service";

export function getDocumentEventType(docType: ContractDocumentType): AuditEventType {
  switch (docType) {
    case ContractDocumentType.ID_FRONT:
      return AuditEventType.ID_FRONT_UPLOADED;
    case ContractDocumentType.ID_BACK:
      return AuditEventType.ID_BACK_UPLOADED;
    case ContractDocumentType.SELFIE_WITH_ID:
      return AuditEventType.SELFIE_WITH_ID_UPLOADED;
    case ContractDocumentType.BANK_CERTIFICATE:
      return AuditEventType.BANK_CERTIFICATE_UPLOADED;
    case ContractDocumentType.PAYROLL_STUB:
      return AuditEventType.PAYROLL_STUB_UPLOADED;
    default:
      return AuditEventType.ADDITIONAL_DOCUMENT_UPLOADED;
  }
}


type TrackDocumentUploadedInput = {
  contractId: string;
  signerId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  docType: ContractDocumentType;
  documentId: string;
  label: string;
  mimeType: string | null;
  sizeBytes: number | null;
  documentHash: string;
  replacedPrevious: boolean;
};

export async function trackContractDocumentUploaded(
  input: TrackDocumentUploadedInput
) {
  return logAuditEvent({
    contractId: input.contractId,
    signerId: input.signerId ?? null,
    eventType: getDocumentEventType(input.docType),
    actorType: AuditActorType.OPERATOR,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    documentHash: input.documentHash,
    metadata: {
      documentId: input.documentId,
      docType: input.docType,
      label: input.label,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      replacedPrevious: input.replacedPrevious,
    },
  });
}