import cloudinary from "../config/cloudinary";
import { prisma } from "../database/db";
import { ContractDocumentType } from "../generated/prisma/enums";

const VALID_TYPES = [
  "ID_FRONT",
  "ID_BACK",
  "SELFIE_WITH_ID",
  "BANK_CERTIFICATE",
  "PAYROLL_STUB",
  "ADDITIONAL_DOCUMENT",
] as const;

type PublicDocType =
  | "ID_FRONT"
  | "ID_BACK"
  | "SELFIE_WITH_ID"
  | "BANK_CERTIFICATE"
  | "PAYROLL_STUB"
  | "ADDITIONAL_DOCUMENT";

export const BLOCKED_STATUSES = ["CANCELLED", "EXPIRED"] as const;

export function isValidDocType(value: string): value is PublicDocType {
  return VALID_TYPES.includes(value as PublicDocType);
}

export function mapToContractDocumentType(
  docType: PublicDocType
): ContractDocumentType {
  switch (docType) {
    case "ID_FRONT":
      return ContractDocumentType.ID_FRONT;
    case "ID_BACK":
      return ContractDocumentType.ID_BACK;
    case "SELFIE_WITH_ID":
      return ContractDocumentType.SELFIE_WITH_ID;
    case "BANK_CERTIFICATE":
      return ContractDocumentType.BANK_CERTIFICATE;
    case "PAYROLL_STUB":
      return ContractDocumentType.PAYROLL_STUB;
    case "ADDITIONAL_DOCUMENT":
      return ContractDocumentType.ADDITIONAL_DOCUMENT;
  }
}

export function getFolderByType(contractId: string, docType: PublicDocType) {
  return `contracts/${contractId}/${docType.toLowerCase()}`;
}

function getResourceType(mimetype: string) {
  if (mimetype === "application/pdf") return "raw";
  return "image";
}

export async function uploadToCloudinary(
  filePath: string,
  folder: string,
  mimetype: string,
  originalname: string
) {
  const resourceType = getResourceType(mimetype);

  try {
    return await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: originalname,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; http_code?: number };

    if (
      mimetype === "application/pdf" &&
      err?.message?.includes("Password-protected PDFs are not supported")
    ) {
      return await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
        filename_override: originalname,
      });
    }

    throw error;
  }
}

const REQUIRED_DOCUMENT_TYPES: ContractDocumentType[] = [
  ContractDocumentType.BANK_CERTIFICATE,
  ContractDocumentType.ID_FRONT,
  ContractDocumentType.ID_BACK,
  ContractDocumentType.SELFIE_WITH_ID,
  ContractDocumentType.PAYROLL_STUB,
];

export async function updateContractStatusAfterUpload(contractId: string) {
  const docs = await prisma.contractDocument.findMany({
    where: {
      contractId,
      type: { in: REQUIRED_DOCUMENT_TYPES },
    },
    select: {
      type: true,
      fileUrl: true,
    },
  });

  const uploadedTypes = new Set(
    docs
      .filter((doc) => !!doc.fileUrl)
      .map((doc) => doc.type)
  );

  const hasAllRequiredDocuments = REQUIRED_DOCUMENT_TYPES.every((type) =>
    uploadedTypes.has(type)
  );

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: hasAllRequiredDocuments
        ? "DOCUMENTS_UPLOADED"
        : "PENDING_DOCUMENTS",
    },
  });
}