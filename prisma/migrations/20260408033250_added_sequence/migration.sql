 /*
  Warnings:

  - A unique constraint covering the columns `[templateKey,sequence]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sequence` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/

-- 1) Agregar la columna como nullable temporalmente
ALTER TABLE "Contract" ADD COLUMN "sequence" INTEGER;

-- 2) Asignar valor a los registros existentes
UPDATE "Contract"
SET "sequence" = 1
WHERE "sequence" IS NULL;

-- 3) Hacerla obligatoria
ALTER TABLE "Contract"
ALTER COLUMN "sequence" SET NOT NULL;

-- 4) Crear índice único compuesto
CREATE UNIQUE INDEX "Contract_templateKey_sequence_key"
ON "Contract"("templateKey", "sequence");