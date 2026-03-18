CREATE UNIQUE INDEX IF NOT EXISTS "journal_issues_id_journal_unique" ON "journal_issues" USING btree ("id","journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journal_volumes_id_journal_unique" ON "journal_volumes" USING btree ("id","journal_id");--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'journal_issues_volume_journal_consistency_fk'
    ) THEN
        ALTER TABLE "journal_issues"
            ADD CONSTRAINT "journal_issues_volume_journal_consistency_fk"
            FOREIGN KEY ("volume_id","journal_id") REFERENCES "public"."journal_volumes"("id","journal_id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_items_issue_journal_consistency_fk'
    ) THEN
        ALTER TABLE "research_items"
            ADD CONSTRAINT "research_items_issue_journal_consistency_fk"
            FOREIGN KEY ("journal_issue_id","journal_id") REFERENCES "public"."journal_issues"("id","journal_id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_items_issue_requires_journal_check'
    ) THEN
        ALTER TABLE "research_items"
            ADD CONSTRAINT "research_items_issue_requires_journal_check"
            CHECK ("research_items"."journal_issue_id" IS NULL OR "research_items"."journal_id" IS NOT NULL);
    END IF;
END $$;
