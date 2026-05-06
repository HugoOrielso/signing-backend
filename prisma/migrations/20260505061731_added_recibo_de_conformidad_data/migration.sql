-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "isConformityReceiptSigned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReciboConformidadData" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "numeroRecibo" INTEGER,
    "ciudad" TEXT,
    "clienteNombre" TEXT NOT NULL,
    "clienteCC" TEXT,
    "textoRecibido" TEXT,
    "fechaFirma" TIMESTAMP(3),
    "tipoFirma" TEXT,
    "firmaImagenUrl" TEXT,
    "firmaTexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReciboConformidadData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReciboConformidadData_contractId_key" ON "ReciboConformidadData"("contractId");

-- CreateIndex
CREATE INDEX "ReciboConformidadData_contractId_idx" ON "ReciboConformidadData"("contractId");

-- AddForeignKey
ALTER TABLE "ReciboConformidadData" ADD CONSTRAINT "ReciboConformidadData_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
