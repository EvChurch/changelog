-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold');

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "descriptionMarkdown" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "descriptionMarkdown" TEXT;

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdByPersonId" TEXT NOT NULL,
    "assigneePersonId" TEXT,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_positionId_idx" ON "Objective"("positionId");

-- CreateIndex
CREATE INDEX "Objective_assigneePersonId_idx" ON "Objective"("assigneePersonId");

-- CreateIndex
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_assigneePersonId_fkey" FOREIGN KEY ("assigneePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
