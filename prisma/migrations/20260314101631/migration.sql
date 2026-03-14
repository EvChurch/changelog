-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('pending_driver_review', 'pending_leader_review', 'accepted');

-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('driver', 'member');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('pco', 'rock');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "serviceTypeId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "personId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "personId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "personId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL,
    "source" "FeedbackSource" NOT NULL,
    "leaderComment" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "driverComment" TEXT,
    "reviewedByDriverAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_remoteId_provider_key" ON "Person"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_remoteId_provider_key" ON "ServiceType"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Team_remoteId_provider_key" ON "Team"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Position_remoteId_provider_key" ON "Position"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_personId_positionId_key" ON "Assignment"("personId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_remoteId_provider_key" ON "Assignment"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_personId_serviceTypeId_key" ON "Driver"("personId", "serviceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_personId_teamId_key" ON "Leader"("personId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_remoteId_provider_key" ON "Leader"("remoteId", "provider");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
