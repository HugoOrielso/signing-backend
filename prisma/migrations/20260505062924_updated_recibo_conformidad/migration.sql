/*
  Warnings:

  - A unique constraint covering the columns `[numeroRecibo]` on the table `ReciboConformidadData` will be added. If there are existing duplicate values, this will fail.
  - Made the column `numeroRecibo` on table `ReciboConformidadData` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
CREATE SEQUENCE reciboconformidaddata_numerorecibo_seq;
ALTER TABLE "ReciboConformidadData" ALTER COLUMN "numeroRecibo" SET NOT NULL,
ALTER COLUMN "numeroRecibo" SET DEFAULT nextval('reciboconformidaddata_numerorecibo_seq');
ALTER SEQUENCE reciboconformidaddata_numerorecibo_seq OWNED BY "ReciboConformidadData"."numeroRecibo";

-- CreateIndex
CREATE UNIQUE INDEX "ReciboConformidadData_numeroRecibo_key" ON "ReciboConformidadData"("numeroRecibo");
