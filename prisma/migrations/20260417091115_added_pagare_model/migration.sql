-- CreateEnum
CREATE TYPE "PagareStatus" AS ENUM ('DRAFT', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PagareSignatureType" AS ENUM ('TYPED', 'DRAWN');

-- CreateTable
CREATE TABLE "pagares" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "contractId" TEXT NOT NULL,
    "libranzaDataId" TEXT NOT NULL,
    "libranzaToken" TEXT NOT NULL,
    "status" "PagareStatus" NOT NULL DEFAULT 'DRAFT',
    "ciudadFirma" TEXT,
    "fechaSuscripcion" TIMESTAMP(3),
    "fechaPrimeraCuota" TEXT,
    "ciudadPago" TEXT,
    "acreedorNombre" TEXT NOT NULL DEFAULT 'GRUCULCOL',
    "acreedorNit" TEXT NOT NULL,
    "deudorNombre" TEXT NOT NULL,
    "deudorDocumento" TEXT NOT NULL,
    "deudorDocumentoDe" TEXT NOT NULL,
    "deudorDireccion" TEXT NOT NULL,
    "deudorTelefono" TEXT NOT NULL,
    "deudorEmail" TEXT NOT NULL,
    "valorTotal" INTEGER NOT NULL,
    "numeroCuotas" INTEGER NOT NULL,
    "valorCuota" INTEGER NOT NULL,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "interesCorriente" TEXT,
    "interesMora" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagareSignature" (
    "id" TEXT NOT NULL,
    "pagareId" TEXT NOT NULL,
    "type" "PagareSignatureType" NOT NULL,
    "typedValue" TEXT,
    "imageUrl" TEXT,
    "signaturePublicId" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "documentHash" TEXT,

    CONSTRAINT "PagareSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagares_number_key" ON "pagares"("number");

-- CreateIndex
CREATE UNIQUE INDEX "pagares_contractId_key" ON "pagares"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "pagares_libranzaDataId_key" ON "pagares"("libranzaDataId");

-- CreateIndex
CREATE UNIQUE INDEX "pagares_libranzaToken_key" ON "pagares"("libranzaToken");

-- CreateIndex
CREATE INDEX "pagares_number_idx" ON "pagares"("number");

-- CreateIndex
CREATE INDEX "PagareSignature_pagareId_idx" ON "PagareSignature"("pagareId");

-- AddForeignKey
ALTER TABLE "pagares" ADD CONSTRAINT "pagares_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagares" ADD CONSTRAINT "pagares_libranzaDataId_fkey" FOREIGN KEY ("libranzaDataId") REFERENCES "LibranzaData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagareSignature" ADD CONSTRAINT "PagareSignature_pagareId_fkey" FOREIGN KEY ("pagareId") REFERENCES "pagares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
