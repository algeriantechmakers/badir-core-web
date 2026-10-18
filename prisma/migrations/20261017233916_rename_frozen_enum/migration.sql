/*
  Warnings:

  - The values [FROZEN] on the enum `OrganizationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

-- drop leftover Supabase RLS policy (not needed with Prisma)
DROP POLICY IF EXISTS "Anyone can view approved organizations" ON "organizations";

CREATE TYPE "OrganizationStatus_new" AS ENUM ('pending', 'approved', 'rejected', 'frozen');
ALTER TABLE "public"."organizations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "organizations" ALTER COLUMN "status" TYPE "OrganizationStatus_new" USING ("status"::text::"OrganizationStatus_new");
ALTER TYPE "OrganizationStatus" RENAME TO "OrganizationStatus_old";
ALTER TYPE "OrganizationStatus_new" RENAME TO "OrganizationStatus";
DROP TYPE "public"."OrganizationStatus_old";
ALTER TABLE "organizations" ALTER COLUMN "status" SET DEFAULT 'pending';

COMMIT;