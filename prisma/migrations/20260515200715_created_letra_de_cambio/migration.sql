-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "isLetraCambioSigned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LetraCambioData" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tipoFirma" TEXT,
    "firmaImagenUrl" TEXT,
    "firmaTexto" TEXT,
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "fechaFirma" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetraCambioData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetraCambioData_contractId_key" ON "LetraCambioData"("contractId");

-- CreateIndex
CREATE INDEX "LetraCambioData_contractId_idx" ON "LetraCambioData"("contractId");

-- AddForeignKey
ALTER TABLE "LetraCambioData" ADD CONSTRAINT "LetraCambioData_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
