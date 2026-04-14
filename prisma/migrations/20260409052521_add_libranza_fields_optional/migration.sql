/*
  Warnings:

  - You are about to alter the column `amount` on the `Contract` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - The `sumaTotal` column on the `LibranzaData` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `numeroCuotas` column on the `LibranzaData` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `valorCuota` column on the `LibranzaData` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "LibranzaData" DROP COLUMN "sumaTotal",
ADD COLUMN     "sumaTotal" INTEGER,
DROP COLUMN "numeroCuotas",
ADD COLUMN     "numeroCuotas" INTEGER,
DROP COLUMN "valorCuota",
ADD COLUMN     "valorCuota" INTEGER;
