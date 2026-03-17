CREATE TYPE "public"."editor_access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "editor_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "editor_access_request_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editor_access_requests" ADD CONSTRAINT "editor_access_requests_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_access_requests" ADD CONSTRAINT "editor_access_requests_reviewed_by_user_id_app_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editor_access_requests_user_id_idx" ON "editor_access_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "editor_access_requests_status_idx" ON "editor_access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "editor_access_requests_reviewed_by_idx" ON "editor_access_requests" USING btree ("reviewed_by_user_id");