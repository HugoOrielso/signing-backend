-- CreateTable
CREATE TABLE "PublicContractSession" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicContractSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicContractSession_sessionToken_key" ON "PublicContractSession"("sessionToken");

-- CreateIndex
CREATE INDEX "PublicContractSession_contractId_idx" ON "PublicContractSession"("contractId");

-- CreateIndex
CREATE INDEX "PublicContractSession_email_idx" ON "PublicContractSession"("email");

-- CreateIndex
CREATE INDEX "PublicContractSession_sessionToken_idx" ON "PublicContractSession"("sessionToken");

-- AddForeignKey
ALTER TABLE "PublicContractSession" ADD CONSTRAINT "PublicContractSession_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
