-- CreateTable
CREATE TABLE "Postcard" (
    "id" TEXT NOT NULL,
    "originalPhotoUrl" TEXT NOT NULL,
    "generatedImageUrl" TEXT,
    "aiPrompt" TEXT,
    "message" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "senderName" TEXT NOT NULL,
    "location" TEXT,
    "style" TEXT,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postcard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Postcard_status_idx" ON "Postcard"("status");

-- CreateIndex
CREATE INDEX "Postcard_expiresAt_idx" ON "Postcard"("expiresAt");
