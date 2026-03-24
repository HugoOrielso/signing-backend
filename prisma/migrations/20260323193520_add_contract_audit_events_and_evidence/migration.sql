-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('CONTRACT_CREATED', 'CONTRACT_UPDATED', 'PDF_GENERATED', 'LINK_CREATED', 'LINK_OPENED', 'OTP_SENT', 'OTP_VERIFIED', 'SIGNATURE_STARTED', 'SIGNATURE_COMPLETED', 'DOCUMENT_UPLOADED', 'SELFIE_UPLOADED', 'ID_FRONT_UPLOADED', 'ID_BACK_UPLOADED', 'CONTRACT_SIGNED', 'CONTRACT_CANCELLED', 'CONTRACT_EXPIRED', 'HASH_SEALED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'SIGNER', 'SYSTEM');

-- CreateTable
CREATE TABLE "ContractAuditEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "signerId" TEXT,
    "adminId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "actorType" "AuditActorType" NOT NULL,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "documentHash" TEXT,
    "previousHash" TEXT,
    "eventHash" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ContractAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractAuditEvent_contractId_eventAt_idx" ON "ContractAuditEvent"("contractId", "eventAt");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_eventType_idx" ON "ContractAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_signerId_idx" ON "ContractAuditEvent"("signerId");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_adminId_idx" ON "ContractAuditEvent"("adminId");

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "ContractSigner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
