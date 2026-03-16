-- Add forward-compatible JSON description columns
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "description" JSONB;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "description" JSONB;

-- Backfill JSON descriptions from legacy markdown text columns
UPDATE "Team"
SET "description" = jsonb_build_object('markdown', "descriptionMarkdown")
WHERE "description" IS NULL
  AND "descriptionMarkdown" IS NOT NULL;

UPDATE "Position"
SET "description" = jsonb_build_object('markdown', "descriptionMarkdown")
WHERE "description" IS NULL
  AND "descriptionMarkdown" IS NOT NULL;
