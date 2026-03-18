CREATE TYPE "public"."app_role" AS ENUM('reader', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('main_pdf', 'supplementary', 'cover_image', 'dataset_file', 'presentation_file', 'other');--> statement-breakpoint
CREATE TYPE "public"."moderation_decision" AS ENUM('approved', 'changes_requested', 'archived');--> statement-breakpoint
CREATE TYPE "public"."research_item_status" AS ENUM('draft', 'submitted', 'changes_requested', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."research_item_type" AS ENUM('research_paper', 'journal_article', 'conference_paper', 'thesis', 'dissertation', 'capstone_project', 'technical_report', 'patent', 'poster', 'dataset', 'presentation');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"target_type" varchar(80) NOT NULL,
	"target_id" text NOT NULL,
	"action" varchar(120) NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "app_role" DEFAULT 'reader' NOT NULL,
	"department_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"email" varchar(255),
	"orcid" varchar(50),
	"affiliation" varchar(255),
	"linked_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_item_id" uuid NOT NULL,
	"item_version_id" uuid,
	"file_kind" "file_kind" NOT NULL,
	"storage_bucket" varchar(160) NOT NULL,
	"object_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(255),
	"uploaded_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_item_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"abstract" text NOT NULL,
	"license" varchar(160),
	"change_summary" text,
	"notes_to_admin" text,
	"supervisor_name" varchar(160),
	"program_name" varchar(160),
	"publication_date" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_item_id" uuid NOT NULL,
	"item_version_id" uuid NOT NULL,
	"reviewed_by_user_id" text NOT NULL,
	"decision" "moderation_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_item_authors" (
	"research_item_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_order" integer NOT NULL,
	"is_corresponding" boolean DEFAULT false NOT NULL,
	CONSTRAINT "research_item_authors_research_item_id_author_id_pk" PRIMARY KEY("research_item_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "research_item_tags" (
	"research_item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "research_item_tags_research_item_id_tag_id_pk" PRIMARY KEY("research_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "research_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(300) NOT NULL,
	"abstract" text NOT NULL,
	"item_type" "research_item_type" NOT NULL,
	"publication_year" integer NOT NULL,
	"department_id" uuid NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"current_version_id" uuid,
	"status" "research_item_status" DEFAULT 'draft' NOT NULL,
	"license" varchar(160),
	"external_url" text,
	"doi" varchar(255),
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_linked_user_id_app_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_item_version_id_item_versions_id_fk" FOREIGN KEY ("item_version_id") REFERENCES "public"."item_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_app_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_versions" ADD CONSTRAINT "item_versions_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_versions" ADD CONSTRAINT "item_versions_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_item_version_id_item_versions_id_fk" FOREIGN KEY ("item_version_id") REFERENCES "public"."item_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_reviewed_by_user_id_app_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_authors" ADD CONSTRAINT "research_item_authors_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_authors" ADD CONSTRAINT "research_item_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_tags" ADD CONSTRAINT "research_item_tags_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_tags" ADD CONSTRAINT "research_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_items" ADD CONSTRAINT "research_items_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_items" ADD CONSTRAINT "research_items_submitted_by_user_id_app_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_user_id_idx" ON "activity_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "app_users_role_idx" ON "app_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "app_users_department_id_idx" ON "app_users" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "authors_linked_user_id_idx" ON "authors" USING btree ("linked_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_slug_unique" ON "departments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "files_research_item_id_idx" ON "files" USING btree ("research_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "files_bucket_object_key_unique" ON "files" USING btree ("storage_bucket","object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "item_versions_item_version_unique" ON "item_versions" USING btree ("research_item_id","version_number");--> statement-breakpoint
CREATE INDEX "item_versions_research_item_id_idx" ON "item_versions" USING btree ("research_item_id");--> statement-breakpoint
CREATE INDEX "moderation_decisions_item_id_idx" ON "moderation_decisions" USING btree ("research_item_id");--> statement-breakpoint
CREATE INDEX "research_item_authors_item_id_idx" ON "research_item_authors" USING btree ("research_item_id");--> statement-breakpoint
CREATE INDEX "research_item_tags_item_id_idx" ON "research_item_tags" USING btree ("research_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_items_slug_unique" ON "research_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "research_items_status_idx" ON "research_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "research_items_type_idx" ON "research_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "research_items_publication_year_idx" ON "research_items" USING btree ("publication_year");--> statement-breakpoint
CREATE INDEX "research_items_department_id_idx" ON "research_items" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "research_items_submitted_by_user_id_idx" ON "research_items" USING btree ("submitted_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");