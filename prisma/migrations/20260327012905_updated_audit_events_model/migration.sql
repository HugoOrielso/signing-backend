-- DropForeignKey
ALTER TABLE "ContractAuditEvent" DROP CONSTRAINT "ContractAuditEvent_contractId_fkey";

-- CreateIndex
CREATE INDEX "ContractAuditEvent_contractId_createdAt_idx" ON "ContractAuditEvent"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_contractId_id_idx" ON "ContractAuditEvent"("contractId", "id");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_eventType_idx" ON "ContractAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_signerId_idx" ON "ContractAuditEvent"("signerId");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_adminId_idx" ON "ContractAuditEvent"("adminId");

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
