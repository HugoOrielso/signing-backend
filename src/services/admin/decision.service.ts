import { prisma } from "../../database/db";
import { IdentityVerificationStatus } from "../../generated/prisma/enums";


export function mapDecisionStatusToIdentityStatus(
  status?: string
): IdentityVerificationStatus {
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

export async function getContractWithIdentityVerification(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      identityVerification: true,
      libranzaData: true,
      parties: true,
      signers: true,
      documents: true,
      pagares: true,
    },
  });

  if (!contract) {
    throw new Error("CONTRACT_NOT_FOUND");
  }

  return contract;
}

type ManualIdentityDecisionInput = {
  contractId: string;
  status: "approved" | "declined" | "resubmission_requested" | "expired" | "abandoned";
  notes?: string;
  rejectionReason?: string;
  rawResponse?: unknown;
};

export async function updateIdentityVerificationManually({
  contractId,
  status,
  notes,
  rejectionReason,
  rawResponse,
}: ManualIdentityDecisionInput) {
  const identityStatus = mapDecisionStatusToIdentityStatus(status);
  const now = new Date();

  const identityVerification =
    await prisma.identityVerification.upsert({
      where: { contractId },
      create: {
        contractId,
        status: identityStatus,
        providerStatus: status,
        notes,
        rejectionReason:
          identityStatus === "REJECTED" ? rejectionReason : null,
        processedAt: now,
        approvedAt: identityStatus === "APPROVED" ? now : null,
        rejectedAt: identityStatus === "REJECTED" ? now : null,
        rawResponse: rawResponse as any,
      },
      update: {
        status: identityStatus,
        providerStatus: status,
        notes,
        rejectionReason:
          identityStatus === "REJECTED" ? rejectionReason : null,
        processedAt: now,
        approvedAt: identityStatus === "APPROVED" ? now : null,
        rejectedAt: identityStatus === "REJECTED" ? now : null,
        rawResponse: rawResponse as any,
      },
    });

  const nextContractStatus =
    identityStatus === "APPROVED"
      ? "READY_TO_SIGN"
      : identityStatus === "REJECTED"
        ? "REJECTED"
        : "PENDING_VERIFICATION";

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: nextContractStatus,
    },
    include: {
      identityVerification: true,
      libranzaData: true,
      parties: true,
      signers: true,
      documents: true,
      pagares: true,
    },
  });

  return {
    identityVerification,
    contract,
  };
}