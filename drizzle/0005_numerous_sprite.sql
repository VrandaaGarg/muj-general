CREATE TYPE "public"."journal_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "journal_editorial_board" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"role" varchar(100) NOT NULL,
	"person_name" varchar(200) NOT NULL,
	"affiliation" text,
	"email" varchar(255),
	"orcid" varchar(40),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"volume_id" uuid NOT NULL,
	"issue_number" integer NOT NULL,
	"title" varchar(255),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_volumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"volume_number" integer NOT NULL,
	"title" varchar(255),
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(280) NOT NULL,
	"description" text,
	"cover_image_key" text,
	"issn" varchar(20),
	"eissn" varchar(20),
	"aim" text,
	"scope" text,
	"topics" text,
	"content_types" text,
	"ethics_policy" jsonb,
	"disclosures_policy" jsonb,
	"rights_permissions" jsonb,
	"contact_info" jsonb,
	"submission_checklist" jsonb,
	"submission_guidelines" jsonb,
	"how_to_publish" jsonb,
	"fees_and_funding" jsonb,
	"status" "journal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "journal_id" uuid;--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "journal_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "page_range" varchar(30);--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "article_number" varchar(30);--> statement-breakpoint
ALTER TABLE "journal_editorial_board" ADD CONSTRAINT "journal_editorial_board_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_issues" ADD CONSTRAINT "journal_issues_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_issues" ADD CONSTRAINT "journal_issues_volume_id_journal_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "public"."journal_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_volumes" ADD CONSTRAINT "journal_volumes_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_editorial_board_journal_id_idx" ON "journal_editorial_board" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "journal_editorial_board_display_order_idx" ON "journal_editorial_board" USING btree ("journal_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_issues_unique_per_volume" ON "journal_issues" USING btree ("volume_id","issue_number");--> statement-breakpoint
CREATE INDEX "journal_issues_journal_id_idx" ON "journal_issues" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "journal_issues_volume_id_idx" ON "journal_issues" USING btree ("volume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_volumes_unique_per_journal" ON "journal_volumes" USING btree ("journal_id","volume_number");--> statement-breakpoint
CREATE INDEX "journal_volumes_journal_id_idx" ON "journal_volumes" USING btree ("journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journals_slug_unique" ON "journals" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "journals_name_unique" ON "journals" USING btree ("name");--> statement-breakpoint
CREATE INDEX "journals_status_idx" ON "journals" USING btree ("status");--> statement-breakpoint
ALTER TABLE "research_items" ADD CONSTRAINT "research_items_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_items" ADD CONSTRAINT "research_items_journal_issue_id_journal_issues_id_fk" FOREIGN KEY ("journal_issue_id") REFERENCES "public"."journal_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_items_journal_id_idx" ON "research_items" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "research_items_journal_issue_id_idx" ON "research_items" USING btree ("journal_issue_id");