-- CreateTable
CREATE TABLE "PcoSyncToken" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcoSyncToken_pkey" PRIMARY KEY ("id")
);
