# Database Schema (`muj-general`)

This document reflects the current Drizzle schema in `src/db/schema.ts`.

## Stack Context

- App: Next.js
- Database: PostgreSQL
- Auth: Better Auth
- Storage: Cloudflare R2 (S3-compatible)

## Enums

### `app_role`

- `reader`
- `editor`
- `admin`

### `research_item_status`

- `draft`
- `submitted`
- `changes_requested`
- `approved`
- `published`
- `archived`

### `research_item_type`

- `research_paper`
- `journal_article`
- `conference_paper`
- `thesis`
- `dissertation`
- `capstone_project`
- `technical_report`
- `patent`
- `poster`
- `dataset`
- `presentation`

### `file_kind`

- `main_pdf`
- `supplementary`
- `cover_image`
- `dataset_file`
- `presentation_file`
- `other`

### `moderation_decision`

- `approved`
- `changes_requested`
- `archived`

### `editor_access_request_status`

- `pending`
- `approved`
- `rejected`

## Tables

### `user` (Better Auth)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `name` | `text` | Required |
| `email` | `text` | Required, unique (`user_email_unique`) |
| `email_verified` | `boolean` | Default `false` |
| `image` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

### `session` (Better Auth)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `expires_at` | `timestamptz` | Required |
| `token` | `text` | Required, unique (`session_token_unique`) |
| `ip_address` | `text` | Nullable |
| `user_agent` | `text` | Nullable |
| `user_id` | `text` | FK -> `user.id` (`onDelete: cascade`) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes: `session_user_id_idx`

### `account` (Better Auth)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `account_id` | `text` | Required |
| `provider_id` | `text` | Required |
| `user_id` | `text` | FK -> `user.id` (`onDelete: cascade`) |
| `access_token` | `text` | Nullable |
| `refresh_token` | `text` | Nullable |
| `id_token` | `text` | Nullable |
| `access_token_expires_at` | `timestamptz` | Nullable |
| `refresh_token_expires_at` | `timestamptz` | Nullable |
| `scope` | `text` | Nullable |
| `password` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes/constraints:

- `account_user_id_idx`
- `account_provider_account_unique` on (`provider_id`, `account_id`)

### `verification` (Better Auth)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `identifier` | `text` | Required |
| `value` | `text` | Required |
| `expires_at` | `timestamptz` | Required |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Index: `verification_identifier_idx`

### `departments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `name` | `varchar(160)` | Required |
| `slug` | `varchar(180)` | Required, unique (`departments_slug_unique`) |
| `description` | `text` | Nullable |
| `archived_at` | `timestamptz` | Nullable (soft archive) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

### `app_users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | PK, FK -> `user.id` (`onDelete: cascade`) |
| `role` | `app_role` | Required, default `reader` |
| `department_id` | `uuid` | Nullable FK -> `departments.id` (`onDelete: set null`) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes: `app_users_role_idx`, `app_users_department_id_idx`

### `editor_access_requests`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `user_id` | `text` | FK -> `app_users.id` (`onDelete: cascade`) |
| `status` | `editor_access_request_status` | Required, default `pending` |
| `message` | `text` | Nullable |
| `reviewed_by_user_id` | `text` | Nullable FK -> `app_users.id` (`onDelete: set null`) |
| `reviewed_at` | `timestamptz` | Nullable |
| `rejection_reason` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes/constraints:

- `editor_access_requests_user_id_idx`
- `editor_access_requests_status_idx`
- `editor_access_requests_reviewed_by_idx`
- Partial unique index `editor_access_requests_one_pending_per_user` where `status = 'pending'`

### `authors`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `display_name` | `varchar(160)` | Required |
| `email` | `varchar(255)` | Nullable |
| `orcid` | `varchar(50)` | Nullable |
| `affiliation` | `varchar(255)` | Nullable |
| `linked_user_id` | `text` | Nullable FK -> `app_users.id` (`onDelete: set null`) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Index: `authors_linked_user_id_idx`

### `tags`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `name` | `varchar(120)` | Required, unique (`tags_name_unique`) |
| `slug` | `varchar(140)` | Required, unique (`tags_slug_unique`) |
| `archived_at` | `timestamptz` | Nullable (soft archive) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

### `research_items`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `slug` | `varchar(200)` | Required, unique (`research_items_slug_unique`) |
| `title` | `varchar(300)` | Required |
| `abstract` | `text` | Required |
| `item_type` | `research_item_type` | Required |
| `publication_year` | `integer` | Required |
| `department_id` | `uuid` | FK -> `departments.id` (`onDelete: restrict`) |
| `submitted_by_user_id` | `text` | FK -> `app_users.id` (`onDelete: restrict`) |
| `current_version_id` | `uuid` | Nullable (relation to `item_versions`) |
| `status` | `research_item_status` | Required, default `draft` |
| `license` | `varchar(160)` | Nullable |
| `external_url` | `text` | Nullable |
| `doi` | `varchar(255)` | Nullable |
| `published_at` | `timestamptz` | Nullable |
| `archived_at` | `timestamptz` | Nullable |
| `view_count` | `integer` | Required, default `0` |
| `download_count` | `integer` | Required, default `0` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes:

- `research_items_status_idx`
- `research_items_type_idx`
- `research_items_publication_year_idx`
- `research_items_department_id_idx`
- `research_items_submitted_by_user_id_idx`

### `item_versions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `version_number` | `integer` | Required |
| `title` | `varchar(300)` | Required |
| `abstract` | `text` | Required |
| `license` | `varchar(160)` | Nullable |
| `change_summary` | `text` | Nullable |
| `notes_to_admin` | `text` | Nullable |
| `supervisor_name` | `varchar(160)` | Nullable |
| `program_name` | `varchar(160)` | Nullable |
| `publication_date` | `timestamptz` | Nullable |
| `created_by_user_id` | `text` | FK -> `app_users.id` (`onDelete: restrict`) |
| `created_at` | `timestamptz` | Default `now()` |

Indexes/constraints:

- Unique `item_versions_item_version_unique` on (`research_item_id`, `version_number`)
- `item_versions_research_item_id_idx`

### `files`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `item_version_id` | `uuid` | Nullable FK -> `item_versions.id` (`onDelete: set null`) |
| `file_kind` | `file_kind` | Required |
| `storage_bucket` | `varchar(160)` | Required |
| `object_key` | `text` | Required |
| `original_name` | `varchar(255)` | Required |
| `mime_type` | `varchar(160)` | Required |
| `size_bytes` | `integer` | Required |
| `checksum` | `varchar(255)` | Nullable |
| `uploaded_by_user_id` | `text` | FK -> `app_users.id` (`onDelete: restrict`) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Indexes/constraints:

- `files_research_item_id_idx`
- Unique `files_bucket_object_key_unique` on (`storage_bucket`, `object_key`)

### `moderation_decisions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `item_version_id` | `uuid` | FK -> `item_versions.id` (`onDelete: cascade`) |
| `reviewed_by_user_id` | `text` | FK -> `app_users.id` (`onDelete: restrict`) |
| `decision` | `moderation_decision` | Required |
| `comment` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |

Index: `moderation_decisions_item_id_idx`

### `activity_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `actor_user_id` | `text` | Nullable FK -> `app_users.id` (`onDelete: set null`) |
| `target_type` | `varchar(80)` | Required |
| `target_id` | `text` | Required |
| `action` | `varchar(120)` | Required |
| `metadata` | `text` | Nullable (JSON-encoded at app layer) |
| `created_at` | `timestamptz` | Default `now()` |

Index: `activity_logs_actor_user_id_idx`

### `research_item_authors`

Join table between `research_items` and `authors`.

| Column | Type | Notes |
| --- | --- | --- |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `author_id` | `uuid` | FK -> `authors.id` (`onDelete: cascade`) |
| `author_order` | `integer` | Required |
| `is_corresponding` | `boolean` | Required, default `false` |

Constraints/indexes:

- Composite primary key (`research_item_id`, `author_id`)
- `research_item_authors_item_id_idx`

### `research_item_tags`

Join table between `research_items` and `tags`.

| Column | Type | Notes |
| --- | --- | --- |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `tag_id` | `uuid` | FK -> `tags.id` (`onDelete: cascade`) |

Constraints/indexes:

- Composite primary key (`research_item_id`, `tag_id`)
- `research_item_tags_item_id_idx`

### `research_item_references`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default random |
| `research_item_id` | `uuid` | FK -> `research_items.id` (`onDelete: cascade`) |
| `citation_text` | `text` | Required |
| `url` | `text` | Nullable |
| `reference_order` | `integer` | Required |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated |

Index: `research_item_references_item_id_idx`

## Relationship Summary

- `user` 1:1 `app_users`
- `user` 1:N `session`
- `user` 1:N `account`
- `app_users` N:1 `departments` (nullable)
- `editor_access_requests` N:1 `app_users` (`user_id`)
- `editor_access_requests` N:1 `app_users` (`reviewed_by_user_id`, nullable)
- `authors` N:1 `app_users` (`linked_user_id`, nullable)
- `research_items` N:1 `departments`
- `research_items` N:1 `app_users` (`submitted_by_user_id`)
- `research_items` 1:N `item_versions`
- `research_items` 1:N `files`
- `research_items` 1:N `moderation_decisions`
- `research_items` N:M `authors` via `research_item_authors`
- `research_items` N:M `tags` via `research_item_tags`
- `research_items` 1:N `research_item_references`
- `item_versions` 1:N `files`
- `item_versions` 1:N `moderation_decisions`

## Current Schema Notes

- `departments` and `tags` now support soft-archive via `archived_at`.
- `research_items` tracks metrics with `view_count` and `download_count`.
- `activity_logs.metadata` is stored as `text` (JSON string if needed), not `jsonb`.
- Better Auth-owned tables are: `user`, `session`, `account`, `verification`.
