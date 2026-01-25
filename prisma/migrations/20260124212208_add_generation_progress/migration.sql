-- AlterTable
ALTER TABLE "Postcard" ADD COLUMN     "generationProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "generationStatus" TEXT;
