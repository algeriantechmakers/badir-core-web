-- AlterEnum
ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'FROZEN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "scheduled_deletion_at" TIMESTAMP(3);
