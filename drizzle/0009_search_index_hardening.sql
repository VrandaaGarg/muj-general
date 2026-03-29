CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "authors_display_name_idx" ON "authors" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journals_status_name_idx" ON "journals" USING btree ("status", "name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_items_workflow_stage_updated_at_idx" ON "research_items" USING btree ("workflow_stage", "updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_versions_research_item_created_at_idx" ON "item_versions" USING btree ("research_item_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_item_version_id_idx" ON "files" USING btree ("item_version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_item_peer_reviews_item_status_idx" ON "research_item_peer_reviews" USING btree ("research_item_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_item_authors_author_id_idx" ON "research_item_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_item_tags_tag_id_idx" ON "research_item_tags" USING btree ("tag_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "research_items_title_trgm_idx" ON "research_items" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_items_abstract_trgm_idx" ON "research_items" USING gin ("abstract" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authors_display_name_trgm_idx" ON "authors" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authors_email_trgm_idx" ON "authors" USING gin ("email" gin_trgm_ops) WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journals_name_trgm_idx" ON "journals" USING gin ("name" gin_trgm_ops);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "research_items_published_sort_idx"
  ON "research_items" USING btree ("published_at" DESC, "updated_at" DESC)
  WHERE "status" = 'published';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "research_items_published_journal_idx"
  ON "research_items" USING btree ("journal_id", "journal_issue_id", "published_at" DESC, "updated_at" DESC)
  WHERE "status" = 'published' AND "journal_id" IS NOT NULL;
