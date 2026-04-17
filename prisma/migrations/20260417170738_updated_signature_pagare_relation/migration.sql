/*
  Warnings:

  - A unique constraint covering the columns `[pagareId]` on the table `PagareSignature` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PagareSignature_pagareId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PagareSignature_pagareId_key" ON "PagareSignature"("pagareId");
