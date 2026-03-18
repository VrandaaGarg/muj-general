ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
