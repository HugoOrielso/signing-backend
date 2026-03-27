import { getDocumentEventType } from "../../controllers/contracts/client/documents/upload/upload.controller";
import { AuditActorType, DocumentType } from "../../generated/prisma/enums";
import { logAuditEvent } from "./audit.service";


type TrackDocumentUploadedInput = {
  contractId: string;
  signerId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  docType: DocumentType;
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
    actorType: AuditActorType.SIGNER,
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