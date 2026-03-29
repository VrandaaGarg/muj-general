# Search and Access Cleanup

## What changed

- Unified submission access remains centralized in `src/lib/submission-access.ts`
- Submission-specific server actions now reuse the same access helper instead of repeating route-specific checks
- Added targeted schema indexes for common joins and workflow queries in `src/db/schema.ts`
- Added a SQL migration in `drizzle/0009_search_index_hardening.sql` for trigram and partial indexes used by public browse, author autocomplete, and journal lookups

## Why these indexes

- `research_items` trigram indexes support current `ILIKE` search on title and abstract
- `authors` trigram indexes support autocomplete by display name and email
- `journals` trigram index supports journal-name search if we add or expand it later
- partial published indexes speed public repository browsing and journal detail pages without indexing drafts/review-only rows
- reverse join indexes on `research_item_tags` and `research_item_authors` support tag and author driven lookups
- workflow and peer-review composite indexes support moderation queues and review summaries

## Query patterns covered

- `/research` public browse and text search
- `/journals/[slug]` published item and online-first lists
- `/api/authors/search` autocomplete
- admin/editor moderation queues
- related-item lookups by author or tag joins

## Follow-up

- Run the new migration before benchmarking search performance
- Apply the trigram migration in an environment where `pg_trgm` can be enabled and preferably during a maintenance window if the tables are already large
- Use `EXPLAIN ANALYZE` on the public research query and author search query after deploying
- If journal-name search becomes a first-class UI feature, wire it to the new trigram index rather than adding client-only filtering
