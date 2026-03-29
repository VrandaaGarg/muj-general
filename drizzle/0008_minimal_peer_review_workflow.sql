CREATE TYPE "public"."research_item_workflow_stage" AS ENUM(
	'draft',
	'submitted',
	'editor_review',
	'peer_review',
	'editor_revision_requested',
	'editor_forwarded_to_admin',
	'admin_review',
	'awaiting_submitter_confirmation',
	'ready_to_publish',
	'published',
	'declined_by_submitter',
	'archived'
);--> statement-breakpoint
CREATE TYPE "public"."submitter_confirmation_status" AS ENUM(
	'not_requested',
	'pending',
	'confirmed',
	'revision_requested',
	'declined_by_submitter'
);--> statement-breakpoint
CREATE TYPE "public"."peer_review_status" AS ENUM('pending', 'accepted', 'declined', 'completed', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."peer_review_recommendation" AS ENUM('accept', 'minor_revision', 'major_revision', 'reject');--> statement-breakpoint

ALTER TABLE "journals"
	ADD COLUMN "editorial_board_can_review_submissions" boolean DEFAULT true NOT NULL;--> statement-breakpoint

ALTER TABLE "research_items"
	ADD COLUMN "workflow_stage" "research_item_workflow_stage" DEFAULT 'draft' NOT NULL,
	ADD COLUMN "handling_editor_user_id" text,
	ADD COLUMN "submitter_confirmation_status" "submitter_confirmation_status" DEFAULT 'not_requested' NOT NULL,
	ADD COLUMN "submitter_confirmation_note" text,
	ADD COLUMN "submitter_confirmation_requested_at" timestamp with time zone,
	ADD COLUMN "submitter_confirmation_responded_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "research_items"
	ADD CONSTRAINT "research_items_handling_editor_user_id_app_users_id_fk"
	FOREIGN KEY ("handling_editor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "research_items_workflow_stage_idx" ON "research_items" USING btree ("workflow_stage");--> statement-breakpoint
CREATE INDEX "research_items_handling_editor_user_id_idx" ON "research_items" USING btree ("handling_editor_user_id");--> statement-breakpoint

UPDATE "research_items"
SET "workflow_stage" = CASE
	WHEN "status" = 'draft' THEN 'draft'::"research_item_workflow_stage"
	WHEN "status" = 'submitted' THEN 'submitted'::"research_item_workflow_stage"
	WHEN "status" = 'changes_requested' THEN 'editor_revision_requested'::"research_item_workflow_stage"
	WHEN "status" = 'approved' THEN 'ready_to_publish'::"research_item_workflow_stage"
	WHEN "status" = 'published' THEN 'published'::"research_item_workflow_stage"
	WHEN "status" = 'archived' THEN 'archived'::"research_item_workflow_stage"
	ELSE 'draft'::"research_item_workflow_stage"
END;--> statement-breakpoint

CREATE TABLE "research_item_peer_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_item_id" uuid NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"invitee_user_id" text,
	"invitee_email" varchar(255) NOT NULL,
	"invitee_name" varchar(200),
	"status" "peer_review_status" DEFAULT 'pending' NOT NULL,
	"invite_token" varchar(255),
	"invite_expires_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"recommendation" "peer_review_recommendation",
	"review_comment" text,
	"confidential_comment" text,
	"review_submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "research_item_peer_reviews"
	ADD CONSTRAINT "research_item_peer_reviews_research_item_id_research_items_id_fk"
	FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_peer_reviews"
	ADD CONSTRAINT "research_item_peer_reviews_invited_by_user_id_app_users_id_fk"
	FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_item_peer_reviews"
	ADD CONSTRAINT "research_item_peer_reviews_invitee_user_id_app_users_id_fk"
	FOREIGN KEY ("invitee_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "research_item_peer_reviews_item_id_idx" ON "research_item_peer_reviews" USING btree ("research_item_id");--> statement-breakpoint
CREATE INDEX "research_item_peer_reviews_invitee_user_id_idx" ON "research_item_peer_reviews" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "research_item_peer_reviews_status_idx" ON "research_item_peer_reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "research_item_peer_reviews_item_email_unique" ON "research_item_peer_reviews" USING btree ("research_item_id", "invitee_email");
