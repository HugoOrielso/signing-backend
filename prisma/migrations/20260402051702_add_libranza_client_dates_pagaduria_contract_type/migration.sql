-- CreateEnum
CREATE TYPE "ContractEmploymentType" AS ENUM ('PROVISIONAL', 'TEMPORAL', 'PROVISIONAL_VACANTE_DEFINITIVA', 'CARRERA_ADMINISTRATIVA', 'PENSIONADO');

-- AlterTable
ALTER TABLE "LibranzaData" ADD COLUMN     "clienteFechaExpedicionCC" DATE,
ADD COLUMN     "clienteFechaNacimiento" DATE,
ADD COLUMN     "pagaduriaDepartamento" TEXT,
ADD COLUMN     "pagaduriaMunicipio" TEXT,
ADD COLUMN     "pagaduriaNombre" TEXT,
ADD COLUMN     "tipoContrato" "ContractEmploymentType";

-- CreateIndex
CREATE INDEX "LibranzaData_pagaduriaNombre_idx" ON "LibranzaData"("pagaduriaNombre");

-- CreateIndex
CREATE INDEX "LibranzaData_tipoContrato_idx" ON "LibranzaData"("tipoContrato");
