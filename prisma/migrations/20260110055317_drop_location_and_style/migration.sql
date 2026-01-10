/*
  Warnings:

  - You are about to drop the column `location` on the `Postcard` table. All the data in the column will be lost.
  - You are about to drop the column `style` on the `Postcard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Postcard" DROP COLUMN "location",
DROP COLUMN "style";
