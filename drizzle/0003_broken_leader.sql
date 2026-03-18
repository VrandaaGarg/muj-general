CREATE TABLE IF NOT EXISTS "research_item_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_item_id" uuid NOT NULL,
	"citation_text" text NOT NULL,
	"url" text,
	"reference_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "download_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'research_item_references_research_item_id_research_items_id_fk'
    ) THEN
        ALTER TABLE "research_item_references"
            ADD CONSTRAINT "research_item_references_research_item_id_research_items_id_fk"
            FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_item_references_item_id_idx" ON "research_item_references" USING btree ("research_item_id");
