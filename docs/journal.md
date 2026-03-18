# Journal Feature — Schema & Design

## Overview

Journals are publication containers (e.g. "Discoveries in Sustainable Development") that group research articles into Volumes -> Issues -> Articles. Admins create and manage journals; editors assign eligible articles to a journal/issue during submission.

This design keeps journals as a publication layer on top of the existing repository instead of creating a separate article system.

## Relationship Diagram

```
journals
|-- journal_editorial_board  (1 : many)
|-- journal_volumes          (1 : many)
|   `-- journal_issues       (1 : many)
|       `-- research_items   (1 : many, via journal_issue_id)
`-- research_items           (1 : many, via journal_id for online-first or issue-assigned items)
```

## Tables

### 1. `journals`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(255) | e.g. "Discoveries in Sustainable Development" |
| `slug` | varchar(280) | URL-friendly, unique |
| `description` | text (nullable) | Short intro paragraph |
| `cover_image_key` | text (nullable) | R2 object key for journal branding |
| `issn` | varchar(20) (nullable) | Print ISSN |
| `eissn` | varchar(20) (nullable) | Electronic ISSN |
| `aim_and_scope` | text (nullable) | Plain text paragraph |
| `topics` | text (nullable) | Plain text paragraph |
| `content_types` | text (nullable) | Plain text paragraph |
| `ethics_policy` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `disclosures_policy` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `rights_permissions` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `contact_info` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `submission_checklist` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `submission_guidelines` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `how_to_publish` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `fees_and_funding` | jsonb (nullable) | `[{ heading: string, content: string }]` |
| `status` | enum(`active`, `archived`) | |
| `created_at`, `updated_at` | timestamp | |

Plain text fields (`aim_and_scope`, `topics`, `content_types`, `description`) are single paragraphs.
JSONB policy/guideline fields store arrays of `{ heading, content }` for structured sub-sections within each field.

### 2. `journal_editorial_board`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `journal_id` | uuid FK → journals | |
| `role` | varchar(100) | Free text; UI suggests presets (Editor-in-Chief, Publisher, Associate Editor, Assistant Editor, Advisory Board, Reviewer) + custom option |
| `person_name` | varchar(200) | |
| `affiliation` | text (nullable) | University / organization |
| `email` | varchar(255) (nullable) | |
| `orcid` | varchar(40) (nullable) | |
| `display_order` | integer | Ordering within the board |
| `created_at`, `updated_at` | timestamp | |

### 3. `journal_volumes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `journal_id` | uuid FK → journals | |
| `volume_number` | integer | Vol. 1, 2, 3… |
| `title` | varchar(255) (nullable) | Optional custom title |
| `year` | integer | Publication year |
| `created_at`, `updated_at` | timestamp | |

Unique constraint: `(journal_id, volume_number)`

### 4. `journal_issues`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `journal_id` | uuid FK -> journals | Kept for simpler filtering and consistency checks |
| `volume_id` | uuid FK -> journal_volumes | Required |
| `issue_number` | integer | Issue 1, 2, 3… |
| `title` | varchar(255) (nullable) | e.g. "Special Issue on AI" |
| `published_at` | timestamp (nullable) | |
| `created_at`, `updated_at` | timestamp | |

Unique constraint: `(volume_id, issue_number)`

### 5. New columns on `research_items`

| Column | Type | Notes |
|---|---|---|
| `journal_id` | uuid FK -> journals (nullable) | Which journal this belongs to; supports online-first items |
| `journal_issue_id` | uuid FK -> journal_issues (nullable) | Which specific issue |
| `page_range` | varchar(30) (nullable) | e.g. "12-28" |
| `article_number` | varchar(30) (nullable) | e.g. "e2025-0042" |

- Items without `journal_id` = standalone repository works (thesis, dataset, poster, etc.)
- Items with `journal_id` but no `journal_issue_id` = "online first" / published into a journal before issue assignment

## Recommended Validation Rules

These should be enforced in server actions from day one, and can later be reinforced with database constraints or triggers.

1. If `research_items.journal_issue_id` is set, that issue must belong to `research_items.journal_id`.
2. If `journal_issues.volume_id` is set, that volume must belong to `journal_issues.journal_id`.
3. An item cannot have `journal_issue_id` without also having `journal_id`.
4. A journal issue cannot be created for a volume that belongs to a different journal.
5. Archived journals/issues should not be selectable for new submissions unless explicitly restored.

## Allowed Content Types For Journals

Recommended journal-eligible `research_item_type` values:

- `research_paper`
- `journal_article`
- `conference_paper` (optional, only if proceedings-style publishing is desired)

Recommended non-journal item types:

- `thesis`
- `dissertation`
- `capstone_project`
- `technical_report` (optional, depending on editorial policy)
- `patent`
- `poster`
- `dataset`
- `presentation`

This restriction should live in validation logic so the UI and server both reject invalid journal assignments.

## Publishing Modes

### Standalone Repository Item

- `journal_id = null`
- `journal_issue_id = null`
- Behaves like the current repository model

### Journal Online-First Item

- `journal_id != null`
- `journal_issue_id = null`
- Visible on the journal page before issue assignment

### Journal Issue Item

- `journal_id != null`
- `journal_issue_id != null`
- Visible under the specific volume/issue and also on the journal page

## Design Decisions

1. **No collections table** - Volume -> Issue -> Articles is sufficient for now. Collections can be added later if needed.
2. **No cover image on issues** - not needed for academic journals.
3. **Editorial board role is varchar, not enum** - UI provides dropdown presets + custom text input, avoiding schema migrations for new roles.
4. **Policy fields are JSONB** - each stores `[{ heading, content }]` so admins can add multiple sub-sections with headings within a single policy area.
5. **Plain text fields (not markdown)** - aim_and_scope, topics, content_types, description are plain text since faculty users are not expected to know markdown.
6. **Departments remain independent** - a research item can belong to both a department and a journal.
7. **Admin-only journal management** - admins create/edit journals, manage board, create volumes/issues. Editors only select journal/issue when submitting eligible articles.
8. **Keep both `journal_id` and `journal_issue_id` on `research_items`** - this intentionally supports online-first publishing and makes journal filtering simpler.
9. **Keep both `journal_id` and `volume_id` on `journal_issues`** - this duplicates part of the hierarchy, but makes validation and admin querying simpler as long as consistency checks are enforced.
10. **Existing features remain reusable** - authors, tags, files, references, moderation pipeline, and repository detail pages all continue to work.

## Route Plan

Recommended routes:

- `/journals`
- `/journals/[slug]`
- `/journals/[slug]/volumes/[volumeNumber]`
- `/journals/[slug]/volumes/[volumeNumber]/issues/[issueNumber]`

Article detail pages should stay at:

- `/research/[slug]`

This avoids duplicate canonical pages for the same article.

## Admin and Editor Workflow

### Admin

- Create/edit/archive journals
- Manage editorial board entries
- Create volumes and issues
- Assign or reassign online-first items into issues

### Editor

- Submit an eligible article
- Optionally choose a journal
- Optionally choose an issue if one is already available
- If no issue is chosen, the item can remain online-first

### Moderation

- The existing repository moderation flow remains primary
- Admin can publish an item as:
  - standalone repository content
  - journal online-first content
  - issue-assigned journal content

## Future Additions

These are reasonable later, but not required for the first journal release:

- archive fields on journals, volumes, and issues
- issue-level editorial notes
- journal home page analytics
- citation exports tailored to journal metadata
- DOI and acceptance date workflow
