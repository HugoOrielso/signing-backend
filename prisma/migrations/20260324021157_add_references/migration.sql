-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PERSONAL', 'LABORAL');

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "libranzaId" TEXT NOT NULL,
    "type" "ReferenceType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reference_libranzaId_idx" ON "Reference"("libranzaId");

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_libranzaId_fkey" FOREIGN KEY ("libranzaId") REFERENCES "LibranzaData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
