# Database Schema Overview (Current)

Source of truth: `src/db/schema.ts`

This file is a practical overview of the live schema: what tables exist, what fields they contain, and what each table is for.

## Related schema docs in this repo

- `docs/database.md` - detailed reference-style schema notes
- `docs/journal.md` - journal-domain schema/design details
- `changesSchema.md` - schema change planning/history

## Enums

- `app_role`: `reader`, `editor`, `admin`
- `research_item_status`: `draft`, `submitted`, `changes_requested`, `approved`, `published`, `archived`
- `research_item_type`: `research_paper`, `journal_article`, `conference_paper`, `thesis`, `dissertation`, `capstone_project`, `technical_report`, `patent`, `poster`, `dataset`, `presentation`
- `file_kind`: `main_pdf`, `supplementary`, `cover_image`, `dataset_file`, `presentation_file`, `other`
- `moderation_decision`: `approved`, `changes_requested`, `archived`
- `editor_access_request_status`: `pending`, `approved`, `rejected`
- `journal_status`: `active`, `archived`
- `research_item_workflow_stage`: `draft`, `submitted`, `editor_review`, `peer_review`, `editor_revision_requested`, `editor_forwarded_to_admin`, `admin_review`, `awaiting_submitter_confirmation`, `ready_to_publish`, `published`, `declined_by_submitter`, `archived`
- `submitter_confirmation_status`: `not_requested`, `pending`, `confirmed`, `revision_requested`, `declined_by_submitter`
- `peer_review_status`: `pending`, `accepted`, `declined`, `completed`, `expired`, `revoked`
- `peer_review_recommendation`: `accept`, `minor_revision`, `major_revision`, `reject`

## Table inventory

### 1) `user`
Purpose: Better Auth identity record (base authenticated user profile).

Fields:
- `id` (PK) - auth user ID
- `name` - display name
- `email` - login email (unique)
- `email_verified` - email verification flag
- `image` - profile image URL
- `created_at`, `updated_at` - audit timestamps

### 2) `session`
Purpose: Better Auth sessions/token storage.

Fields:
- `id` (PK)
- `expires_at` - session expiry
- `token` - session token (unique)
- `ip_address`, `user_agent` - request metadata
- `user_id` (FK -> `user.id`) - owning user
- `created_at`, `updated_at`

### 3) `account`
Purpose: Better Auth account/provider credentials (email/password and provider metadata).

Fields:
- `id` (PK)
- `account_id`, `provider_id` - provider identity pair (unique together)
- `user_id` (FK -> `user.id`) - owning user
- `access_token`, `refresh_token`, `id_token`
- `access_token_expires_at`, `refresh_token_expires_at`
- `scope`
- `password` - credential hash for password provider
- `created_at`, `updated_at`

### 4) `verification`
Purpose: Better Auth verification/OTP/email verification data.

Fields:
- `id` (PK)
- `identifier` - verification subject key
- `value` - verification value/token
- `expires_at`
- `created_at`, `updated_at`

### 5) `departments`
Purpose: Academic departments used for submission ownership/routing.

Fields:
- `id` (PK, UUID)
- `name`
- `slug` (unique)
- `description`
- `archived_at` - soft archive marker
- `created_at`, `updated_at`

### 6) `app_users`
Purpose: App-level user role and department profile layered on top of auth `user`.

Fields:
- `id` (PK, FK -> `user.id`)
- `role` (`app_role`) - reader/editor/admin
- `department_id` (FK -> `departments.id`, nullable)
- `created_at`, `updated_at`

### 7) `editor_access_requests`
Purpose: Workflow for verified readers requesting editor access.

Fields:
- `id` (PK, UUID)
- `user_id` (FK -> `app_users.id`) - requester
- `status` (`editor_access_request_status`)
- `message` - requester notes
- `reviewed_by_user_id` (FK -> `app_users.id`, nullable)
- `reviewed_at`
- `rejection_reason`
- `created_at`, `updated_at`

Special constraint:
- Partial unique index allows at most one `pending` request per user.

### 8) `authors`
Purpose: Canonical author entities used by research items (can be linked to app users).

Fields:
- `id` (PK, UUID)
- `display_name`
- `email`
- `orcid`
- `affiliation`
- `linked_user_id` (FK -> `app_users.id`, nullable)
- `created_at`, `updated_at`

### 9) `tags`
Purpose: Controlled topical taxonomy for research items.

Fields:
- `id` (PK, UUID)
- `name` (unique)
- `slug` (unique)
- `archived_at`
- `created_at`, `updated_at`

### 10) `journals`
Purpose: Journal master records and policy/content metadata.

Fields:
- `id` (PK, UUID)
- `name` (unique)
- `slug` (unique)
- `description`
- `cover_image_key` - storage object key for journal cover
- `issn`, `eissn`
- `aim_and_scope`
- `topics`
- `content_types`
- `ethics_policy` (jsonb structured sections)
- `disclosures_policy` (jsonb structured sections)
- `rights_permissions` (jsonb structured sections)
- `contact_info` (jsonb structured sections)
- `submission_checklist` (jsonb structured sections)
- `submission_guidelines` (jsonb structured sections)
- `how_to_publish` (jsonb structured sections)
- `fees_and_funding` (jsonb structured sections)
- `editorial_board_can_review_submissions` (boolean)
- `status` (`journal_status`)
- `created_at`, `updated_at`

### 11) `journal_editorial_board`
Purpose: Editorial board roster entries per journal.

Fields:
- `id` (PK, UUID)
- `journal_id` (FK -> `journals.id`)
- `role` - board role label
- `person_name`
- `affiliation`
- `email`
- `orcid`
- `display_order` - UI ordering
- `created_at`, `updated_at`

### 12) `journal_volumes`
Purpose: Volume grouping inside a journal timeline.

Fields:
- `id` (PK, UUID)
- `journal_id` (FK -> `journals.id`)
- `volume_number`
- `title`
- `year`
- `created_at`, `updated_at`

Special constraints:
- Unique per (`journal_id`, `volume_number`)
- Composite unique (`id`, `journal_id`) used by issue consistency FK

### 13) `journal_issues`
Purpose: Issues within journal volumes; attach published research items.

Fields:
- `id` (PK, UUID)
- `journal_id` (FK -> `journals.id`)
- `volume_id` (FK -> `journal_volumes.id`)
- `issue_number`
- `title`
- `published_at`
- `created_at`, `updated_at`

Special constraints:
- Unique per (`volume_id`, `issue_number`)
- Composite FK enforces `volume_id` belongs to same `journal_id`

### 14) `research_items`
Purpose: Canonical submission/manuscript record (core entity for repository + journals + workflow).

Fields:
- `id` (PK, UUID)
- `slug` (unique)
- `title`
- `abstract`
- `item_type` (`research_item_type`)
- `publication_year`
- `department_id` (FK -> `departments.id`)
- `submitted_by_user_id` (FK -> `app_users.id`)
- `current_version_id` (nullable relation to `item_versions.id`)
- `status` (`research_item_status`)
- `workflow_stage` (`research_item_workflow_stage`)
- `handling_editor_user_id` (FK -> `app_users.id`, nullable)
- `submitter_confirmation_status` (`submitter_confirmation_status`)
- `submitter_confirmation_note`
- `submitter_confirmation_requested_at`
- `submitter_confirmation_responded_at`
- `license`
- `external_url`
- `doi`
- `journal_id` (FK -> `journals.id`, nullable)
- `journal_issue_id` (FK -> `journal_issues.id`, nullable)
- `page_range`
- `article_number`
- `published_at`
- `archived_at`
- `view_count`
- `download_count`
- `created_at`, `updated_at`

Special constraints:
- Composite FK enforces `journal_issue_id` belongs to selected `journal_id`
- Check constraint: issue cannot be set without journal

### 15) `item_versions`
Purpose: Version history snapshots for each research item (metadata per revision).

Fields:
- `id` (PK, UUID)
- `research_item_id` (FK -> `research_items.id`)
- `version_number` (unique within an item)
- `title`
- `abstract`
- `license`
- `change_summary`
- `notes_to_admin`
- `supervisor_name`
- `program_name`
- `publication_date`
- `created_by_user_id` (FK -> `app_users.id`)
- `created_at`

### 16) `files`
Purpose: Uploaded file catalog for manuscripts/versions (PDF, cover, supplementary, etc.).

Fields:
- `id` (PK, UUID)
- `research_item_id` (FK -> `research_items.id`)
- `item_version_id` (FK -> `item_versions.id`, nullable)
- `file_kind` (`file_kind`)
- `storage_bucket`
- `object_key`
- `original_name`
- `mime_type`
- `size_bytes`
- `checksum`
- `uploaded_by_user_id` (FK -> `app_users.id`)
- `created_at`, `updated_at`

Special constraints:
- Unique (`storage_bucket`, `object_key`)

### 17) `moderation_decisions`
Purpose: Admin moderation history per item/version.

Fields:
- `id` (PK, UUID)
- `research_item_id` (FK -> `research_items.id`)
- `item_version_id` (FK -> `item_versions.id`)
- `reviewed_by_user_id` (FK -> `app_users.id`)
- `decision` (`moderation_decision`)
- `comment`
- `created_at`

### 18) `research_item_peer_reviews`
Purpose: Peer review invite + response + submitted review record per manuscript.

Fields:
- `id` (PK, UUID)
- `research_item_id` (FK -> `research_items.id`)
- `invited_by_user_id` (FK -> `app_users.id`)
- `invitee_user_id` (FK -> `app_users.id`, nullable)
- `invitee_email`
- `invitee_name`
- `status` (`peer_review_status`)
- `invite_token`
- `invite_expires_at`
- `responded_at`
- `recommendation` (`peer_review_recommendation`, nullable until submitted)
- `review_comment`
- `confidential_comment`
- `review_submitted_at`
- `created_at`, `updated_at`

Special constraints:
- Unique (`research_item_id`, `invitee_email`) prevents duplicate invite targets per item

### 19) `activity_logs`
Purpose: Generic audit log of user actions across entities.

Fields:
- `id` (PK, UUID)
- `actor_user_id` (FK -> `app_users.id`, nullable)
- `target_type` - entity kind
- `target_id` - entity identifier
- `action` - action/event name
- `metadata` - serialized extra context
- `created_at`

### 20) `research_item_authors`
Purpose: Many-to-many join between research items and authors with order/corresponding flags.

Fields:
- `research_item_id` (FK -> `research_items.id`)
- `author_id` (FK -> `authors.id`)
- `author_order`
- `is_corresponding`

Primary key:
- Composite (`research_item_id`, `author_id`)

### 21) `research_item_tags`
Purpose: Many-to-many join between research items and tags.

Fields:
- `research_item_id` (FK -> `research_items.id`)
- `tag_id` (FK -> `tags.id`)

Primary key:
- Composite (`research_item_id`, `tag_id`)

### 22) `research_item_references`
Purpose: Ordered citation/reference list attached to a research item.

Fields:
- `id` (PK, UUID)
- `research_item_id` (FK -> `research_items.id`)
- `citation_text`
- `url`
- `reference_order`
- `created_at`, `updated_at`

## High-level relationship map

- Auth layer: `user` -> `app_users` -> role/department
- Submission core: `research_items` -> `item_versions` + `files`
- Metadata joins: `research_item_authors`, `research_item_tags`, `research_item_references`
- Review workflow: `editor_access_requests`, `moderation_decisions`, `research_item_peer_reviews`, workflow/status fields on `research_items`
- Journal publication layer: `journals` -> `journal_volumes` -> `journal_issues` and optional links from `research_items` (`journal_id`, `journal_issue_id`)
