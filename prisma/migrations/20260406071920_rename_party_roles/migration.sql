/*
  Warnings:

  - The values [CONTRACTOR,CONTRACTED] on the enum `PartyRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PartyRole_new" AS ENUM ('ACREEDOR', 'DEUDOR');
ALTER TABLE "ContractParty" ALTER COLUMN "role" TYPE "PartyRole_new" USING ("role"::text::"PartyRole_new");
ALTER TABLE "ContractSigner" ALTER COLUMN "partyRole" TYPE "PartyRole_new" USING ("partyRole"::text::"PartyRole_new");
ALTER TYPE "PartyRole" RENAME TO "PartyRole_old";
ALTER TYPE "PartyRole_new" RENAME TO "PartyRole";
DROP TYPE "public"."PartyRole_old";
COMMIT;
