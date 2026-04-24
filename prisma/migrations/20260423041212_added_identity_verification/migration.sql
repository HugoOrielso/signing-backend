-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('PENDING_UPLOAD', 'PENDING_PROVIDER', 'PROCESSING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'ERROR');

-- CreateEnum
CREATE TYPE "IdentityVerificationProvider" AS ENUM ('INTERNAL', 'VERIFIK', 'TRUORA');

-- CreateEnum
CREATE TYPE "IdentityVerificationFileType" AS ENUM ('ID_FRONT', 'ID_BACK', 'SELFIE');

-- CreateEnum
CREATE TYPE "IdentityVerificationFileStatus" AS ENUM ('PENDING', 'UPLOADED', 'SENT_TO_PROVIDER', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "pagareId" TEXT,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "provider" "IdentityVerificationProvider" NOT NULL DEFAULT 'INTERNAL',
    "providerRequestId" TEXT,
    "providerStatus" TEXT,
    "providerReference" TEXT,
    "documentNumber" TEXT,
    "fullName" TEXT,
    "faceMatchScore" DOUBLE PRECISION,
    "livenessScore" DOUBLE PRECISION,
    "validationScore" DOUBLE PRECISION,
    "isDocumentValid" BOOLEAN,
    "isDocumentNumberMatch" BOOLEAN,
    "isFaceMatch" BOOLEAN,
    "isLivenessValid" BOOLEAN,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3),
    "processedAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "rejectedAt" TIMESTAMPTZ(3),
    "rawResponse" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerificationFile" (
    "id" TEXT NOT NULL,
    "identityVerificationId" TEXT NOT NULL,
    "type" "IdentityVerificationFileType" NOT NULL,
    "status" "IdentityVerificationFileStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "source" "DocumentSource",
    "publicId" TEXT,
    "resourceType" TEXT,
    "format" TEXT,
    "bytes" INTEGER,
    "providerFileId" TEXT,
    "providerUrl" TEXT,
    "providerStatus" TEXT,
    "notes" TEXT,
    "uploadedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdentityVerificationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_contractId_key" ON "IdentityVerification"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_pagareId_key" ON "IdentityVerification"("pagareId");

-- CreateIndex
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");

-- CreateIndex
CREATE INDEX "IdentityVerificationFile_identityVerificationId_idx" ON "IdentityVerificationFile"("identityVerificationId");

-- CreateIndex
CREATE INDEX "IdentityVerificationFile_type_idx" ON "IdentityVerificationFile"("type");

-- CreateIndex
CREATE INDEX "IdentityVerificationFile_status_idx" ON "IdentityVerificationFile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerificationFile_identityVerificationId_type_key" ON "IdentityVerificationFile"("identityVerificationId", "type");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_pagareId_fkey" FOREIGN KEY ("pagareId") REFERENCES "pagares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationFile" ADD CONSTRAINT "IdentityVerificationFile_identityVerificationId_fkey" FOREIGN KEY ("identityVerificationId") REFERENCES "IdentityVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
