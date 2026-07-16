-- Add pinned flag to applications (LeetCodeSession table is intentionally
-- left in place; the model was removed from the schema but dropping the
-- table is deferred so no data is destroyed automatically)
ALTER TABLE "Application" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
