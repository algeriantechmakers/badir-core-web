/*
  Warnings:

  - You are about to drop the column `isVerified` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "isVerified",
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;
