-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CEDULA_FRENTE', 'CEDULA_REVERSO', 'SELFIE', 'PDF_ADICIONAL', 'IMAGEN_GENERAL');

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
