ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "aim_and_scope" text;--> statement-breakpoint
UPDATE "journals"
SET "aim_and_scope" = trim(
  both E'\n\n' from concat_ws(E'\n\n', "aim", "scope")
)
WHERE "aim_and_scope" IS NULL;--> statement-breakpoint
ALTER TABLE "journals" DROP COLUMN IF EXISTS "aim";--> statement-breakpoint
ALTER TABLE "journals" DROP COLUMN IF EXISTS "scope";
