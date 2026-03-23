-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'OPERATOR');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'OPERATOR';
