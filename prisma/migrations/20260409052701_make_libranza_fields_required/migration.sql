/*
  Warnings:

  - Made the column `amount` on table `Contract` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sumaTotal` on table `LibranzaData` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numeroCuotas` on table `LibranzaData` required. This step will fail if there are existing NULL values in that column.
  - Made the column `valorCuota` on table `LibranzaData` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "LibranzaData" ALTER COLUMN "sumaTotal" SET NOT NULL,
ALTER COLUMN "numeroCuotas" SET NOT NULL,
ALTER COLUMN "valorCuota" SET NOT NULL;
