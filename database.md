# Database Schema

This document defines the MVP database design for the `muj-general` college research repository.

## Stack Context

- App: Next.js
- Database: PostgreSQL
- Auth: Better Auth credentials with email verification
- File storage: Cloudflare R2 via S3-compatible API

## Product Model

The platform has three user levels:

- `reader`: default user, read-only access to published content
- `editor`: can create and manage their own research/work submissions
- `admin`: can manage all content, approve updates, and grant editor access

The system is designed like an institutional repository, not a full academic publisher workflow.

## Core Design Principles

- Keep public discovery centered around published `research_items`
- Keep file binaries out of PostgreSQL; store only S3 metadata and object keys
- Separate authenticated users from research authors
- Use a simple role model for MVP: `reader`, `editor`, `admin`
- Use versioning so moderated edits do not overwrite published records directly
- Require verified accounts before promotion to `editor` or `admin`

## Enums

### `user_role`

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

## Tables

### `departments`

Stores academic departments or schools used for filtering and ownership grouping.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique department name |
| `slug` | `text` | Unique URL-safe identifier |
| `description` | `text` | Optional |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `user`

Core Better Auth user table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `email` | `text` | Unique |
| `name` | `text` | Display name |
| `email_verified` | `boolean` | Default `false` |
| `image` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

Notes:

- Every new signup should default to `email_verified = false`
- This table should stay aligned with Better Auth core schema
- Authentication identity and verification state should live here
- Better Auth owns the `user`, `session`, `account`, and `verification` tables

### `session`

Core Better Auth session table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `user_id` | `text` | FK to `user.id` |
| `token` | `text` | Unique session token |
| `expires_at` | `timestamptz` | Required |
| `ip_address` | `text` | Nullable |
| `user_agent` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `account`

Core Better Auth account table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `user_id` | `text` | FK to `user.id` |
| `account_id` | `text` | Provider account id |
| `provider_id` | `text` | Provider key |
| `access_token` | `text` | Nullable |
| `refresh_token` | `text` | Nullable |
| `id_token` | `text` | Nullable |
| `access_token_expires_at` | `timestamptz` | Nullable |
| `refresh_token_expires_at` | `timestamptz` | Nullable |
| `scope` | `text` | Nullable |
| `password` | `text` | Nullable, used for credentials auth |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `verification`

Core Better Auth verification table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key |
| `identifier` | `text` | Email or verification subject |
| `value` | `text` | Token value or verification payload |
| `expires_at` | `timestamptz` | Required |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `app_users`

App-specific profile table linked 1:1 with Better Auth `user.id`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key and FK to `user.id` |
| `role` | `user_role` | Default `reader` |
| `department_id` | `uuid` | Nullable, FK to `departments.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

Notes:

- Every new signup should default to `role = reader`
- `department_id` is optional and should usually be `null` for normal users
- `department_id` becomes useful for editors/admins and future reporting
- Only verified users should be eligible for promotion to `editor` or `admin`

### `authors`

Represents actual content authors. These do not need login accounts.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `display_name` | `text` | Required |
| `email` | `text` | Nullable |
| `orcid` | `text` | Nullable |
| `affiliation` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `tags`

Stores keywords or topics used for discovery.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique |
| `slug` | `text` | Unique |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `research_items`

Main public-facing repository record.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `slug` | `text` | Unique public URL key |
| `title` | `text` | Current published/display title |
| `abstract` | `text` | Current published/display abstract |
| `item_type` | `research_item_type` | Required |
| `publication_year` | `int` | Indexed |
| `department_id` | `uuid` | FK to `departments.id` |
| `submitted_by_user_id` | `text` | FK to `app_users.id` |
| `current_version_id` | `uuid` | Nullable, FK to `item_versions.id` |
| `status` | `research_item_status` | Required |
| `license` | `text` | Nullable |
| `external_url` | `text` | Nullable |
| `doi` | `text` | Nullable |
| `published_at` | `timestamptz` | Nullable |
| `archived_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

Notes:

- This is the main table used for browse, search, and public detail pages
- Only `published` items should appear on public routes
- `title` and `abstract` stay on this table for faster search and simpler reads

### `item_versions`

Stores editable versions of a research item so draft changes and moderation do not directly overwrite the public record.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `research_item_id` | `uuid` | FK to `research_items.id` |
| `version_number` | `int` | Starts at `1` |
| `title` | `text` | Required |
| `abstract` | `text` | Required |
| `license` | `text` | Nullable |
| `change_summary` | `text` | Nullable |
| `notes_to_admin` | `text` | Nullable |
| `supervisor_name` | `text` | Nullable |
| `program_name` | `text` | Nullable |
| `publication_date` | `date` | Nullable |
| `created_by_user_id` | `text` | FK to `app_users.id` |
| `created_at` | `timestamptz` | Default `now()` |

Notes:

- On approval/publication, selected fields can be copied into `research_items`
- This keeps an edit trail without needing a full event-sourced model

### `research_item_authors`

Ordered many-to-many join between research items and authors.

| Column | Type | Notes |
| --- | --- | --- |
| `research_item_id` | `uuid` | FK to `research_items.id` |
| `author_id` | `uuid` | FK to `authors.id` |
| `author_order` | `int` | Required |
| `is_corresponding` | `boolean` | Default `false` |

Primary key recommendation:

- composite primary key: `research_item_id`, `author_id`

### `research_item_tags`

Many-to-many join between research items and tags.

| Column | Type | Notes |
| --- | --- | --- |
| `research_item_id` | `uuid` | FK to `research_items.id` |
| `tag_id` | `uuid` | FK to `tags.id` |

Primary key recommendation:

- composite primary key: `research_item_id`, `tag_id`

### `files`

Stores uploaded file metadata and S3 references.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `research_item_id` | `uuid` | FK to `research_items.id` |
| `item_version_id` | `uuid` | Nullable, FK to `item_versions.id` |
| `file_kind` | `file_kind` | Required |
| `storage_bucket` | `text` | S3 bucket name |
| `object_key` | `text` | Unique key/path in bucket |
| `original_name` | `text` | Uploaded file name |
| `mime_type` | `text` | Required |
| `size_bytes` | `bigint` | Required |
| `checksum` | `text` | Nullable but recommended |
| `uploaded_by_user_id` | `text` | FK to `app_users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

Notes:

- Do not store file blobs in PostgreSQL
- `item_version_id` allows draft files to belong to a specific version

### `moderation_decisions`

Stores admin moderation actions on submitted content.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `research_item_id` | `uuid` | FK to `research_items.id` |
| `item_version_id` | `uuid` | FK to `item_versions.id` |
| `reviewed_by_user_id` | `text` | FK to `app_users.id` |
| `decision` | `moderation_decision` | Required |
| `comment` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |

Notes:

- This supports light moderation, not peer review
- If `decision = changes_requested`, the editor can revise and resubmit

### `activity_log`

Stores admin-auditable system actions.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `actor_user_id` | `text` | Nullable FK to `app_users.id` |
| `target_type` | `text` | Example: `research_item`, `user`, `file` |
| `target_id` | `uuid` | Target entity id |
| `action` | `text` | Example: `created`, `submitted`, `published`, `role_changed` |
| `metadata` | `jsonb` | Optional event details |
| `created_at` | `timestamptz` | Default `now()` |

## Relationships

- One `department` has many `app_users`
- One `department` has many `research_items`
- One `user` has one `app_user`
- One `app_user` can submit many `research_items`
- One `research_item` has many `item_versions`
- One `research_item` has many `files`
- One `research_item` has many `authors` through `research_item_authors`
- One `research_item` has many `tags` through `research_item_tags`
- One `research_item` has many `moderation_decisions`

## Permissions Model

### `reader`

- View published items
- Search and filter published items
- View public metadata
- Download published files allowed for public access
- Signup with Better Auth credentials and verify email

### `editor`

- All `reader` permissions
- Must be a verified user
- Create draft research items
- Create and update versions of their own submissions
- Upload files for their own submissions
- Submit their own items for moderation
- View their own unpublished items

### `admin`

- Full system access
- Must be a verified user
- Edit any item
- View all unpublished items
- Approve, request changes, publish, archive
- Manage departments and tags
- Manage users and promote readers to editors
- View audit and activity logs

## Workflow Rules

### Submission lifecycle

1. User signs up with Better Auth credentials and verifies email
2. Admin may promote a verified `reader` to `editor`
3. Editor creates a `research_item` in `draft`
4. Editor adds metadata in `item_versions`
5. Editor uploads file records in `files`
6. Editor submits item, status becomes `submitted`
7. Admin reviews and either:
   - marks `changes_requested`
   - marks `approved`
8. On publish, status becomes `published` and `published_at` is set
9. If removed from public visibility later, status becomes `archived`

### Public visibility

- Only `published` items are shown publicly
- `draft`, `submitted`, `changes_requested`, and `approved` stay private to editors/admins

## Index Recommendations

Add indexes on:

- `users.auth_user_id`
- `users.email`
- `users.role`
- `departments.slug`
- `tags.slug`
- `research_items.slug`
- `research_items.status`
- `research_items.item_type`
- `research_items.publication_year`
- `research_items.department_id`
- `research_items.submitted_by_user_id`
- `files.research_item_id`
- `item_versions.research_item_id`
- `moderation_decisions.research_item_id`

Full-text search recommendation for MVP:

- create a PostgreSQL full-text index on `research_items.title` and `research_items.abstract`

## Constraints and Rules

- `user.email` must be unique
- `user.email_verified` should default to `false`
- `app_users.id` must match an existing `user.id`
- `departments.slug` must be unique
- `tags.slug` must be unique
- `research_items.slug` must be unique
- `files.object_key` should be unique per bucket
- `version_number` should be unique per `research_item_id`
- `publication_year` should be validated to a reasonable range
- role promotion to `editor` or `admin` should be blocked unless `email_verified = true`

## Future Extensions

These are not required for MVP but the schema supports them later:

- `collections` for curated groups of research
- `bookmarks` or `saved_searches`
- metrics tables for views/downloads
- DOI or Crossref export tooling
- author profile pages
- embargoed or restricted-access files
- multiple editors per item through an additional join table

## Final Recommendation

For MVP, keep the schema small and relational:

- use `users`, `departments`, `research_items`, `item_versions`, `files`, `authors`, `tags`, `moderation_decisions`, and `activity_log`
- keep role handling simple with one `role` column
- keep `department_id` nullable for users
- keep public discovery based on published `research_items`

This gives us a clean foundation for implementation in PostgreSQL while staying flexible enough for future academic repository features.
