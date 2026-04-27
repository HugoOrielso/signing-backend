-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "assignedAt" TIMESTAMPTZ(3),
ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
