-- CreateEnum
CREATE TYPE "DataReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "dataReviewNotes" TEXT,
ADD COLUMN     "dataReviewStatus" "DataReviewStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Contract_dataReviewStatus_idx" ON "Contract"("dataReviewStatus");
