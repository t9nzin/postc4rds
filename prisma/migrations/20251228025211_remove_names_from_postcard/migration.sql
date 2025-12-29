/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `Postcard` table. All the data in the column will be lost.
  - You are about to drop the column `recipientName` on the `Postcard` table. All the data in the column will be lost.
  - You are about to drop the column `senderName` on the `Postcard` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Postcard_expiresAt_idx";

-- AlterTable
ALTER TABLE "Postcard" DROP COLUMN "expiresAt",
DROP COLUMN "recipientName",
DROP COLUMN "senderName";
