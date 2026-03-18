# Product Gaps

## Current Baseline

- Better Auth email/password auth, email verification, and role-based `app_users` are implemented.
- Reader-to-editor access requests, editor submission/revision flows, admin moderation, and public browse/detail pages are implemented.
- R2 presigned upload plumbing exists in code (env validation, presign route, S3 client), but storage configuration still has operational gaps before the full flow is production-ready.
- Journal feature is functional end-to-end: admin CRUD, editor journal assignment during submission, and public journal listing/detail pages with sectioned layout.

## Completed

- [x] Draft save/resume workflow — editors can save drafts, resume editing, and explicitly submit for review.
- [x] Editor delete draft and withdraw submitted/changes_requested items to archived with audit metadata.
- [x] Admin archive/unpublish flow for published items with required reason and activity log entry.
- [x] Existing-author fuzzy attach — protected on-demand search by name/email, explicit in-app confirm dialog (no window.confirm), deduplication by email.
- [x] Department and tag edit/archive/restore/delete management with safety link guards.
- [x] Admin user management search, filter (role/verified/department), and sort controls.
- [x] Admin moderation queue advanced filters (department/type/year/submitter/sort).
- [x] Admin moderation history filters (decision/department/query/sort) and formula-safe CSV export.
- [x] Admin page section ordering — section with pending items always renders first.
- [x] Save draft / submit for review buttons in correct left/right layout with per-button loading state.
- [x] Toast deduplication guard across editor and admin forms.
- [x] Author email deduplication on submit/revise — reuses existing author row when email matches.
- [x] Admin version-diff UX for resubmission review — side-by-side field, file, and author comparison with visual change indicators.
- [x] View/download counters on research detail pages with fire-and-forget increments.
- [x] Journal CRUD — admin can create/edit journals, create volumes/issues, manage editorial board members.
- [x] Journal public pages — listing page with active journals, detail page with sectioned navigation (About, Articles, For Authors) and all structured content blocks.
- [x] Journal assignment in editor form — eligible item types (research_paper, journal_article, conference_paper) can be assigned to a journal and optionally an issue during submission/revision.
- [x] Email templates — verification, editor access decision, and research moderation notifications with HTML and plain text variants.

## P0 — Immediate Blockers

- R2 bucket CORS still needs to be configured for browser `PUT` uploads from local and production frontend origins.
- Public PDF delivery depends on correct R2 public access or custom-domain configuration.
- Storage setup needs a deployment checklist for `CLOUDFLARE_ACCOUNT_ID`, R2 keys, bucket name, `R2_PUBLIC_BASE_URL`, public access, and CORS. The `.env.example` documents the variables but no operational runbook exists.

## P1 — Journal Feature Gaps

- Admin journal form does not expose all structured JSONB fields for editing. The server actions support `ethicsPolicy`, `disclosuresPolicy`, `rightsPermissions`, `contactInfo`, `submissionChecklist`, and `howToPublish`, but the admin UI only renders fields for name, slug, ISSN, E-ISSN, description, aim & scope, topics, content types, submission guidelines, and fees & funding. The missing fields have no form inputs.
- No "Submit to this journal" link from public journal detail pages. Journal selection is only discoverable inside the general editor submission form as a dropdown that appears for eligible item types. A direct CTA from the journal page would improve discoverability.
- No volume/issue edit or delete in admin. Volumes and issues can be created but not updated or removed after creation.
- No journal cover image upload. The `coverImageKey` column exists in the schema but there is no upload UI or rendering for it.

## P2 — Public Repository Gaps

- Search is still database-filter based and lacks full-text indexing/ranking (no `tsvector`, `ts_rank`, or GIN indexes).
- No citation export actions such as BibTeX, RIS, or CSL-JSON.
- Related items are basic and do not use a richer recommendation strategy.
- Open Graph and structured data are partial — `generateMetadata` sets title and description but there are no `og:image`, `twitter:card`, or JSON-LD markup on any page.

## P2 — UX and Robustness Gaps

- No custom `error.tsx` or `not-found.tsx` pages for any route segment.
- Loading and empty-state polish is inconsistent across admin/editor flows.
- Some admin/editor mobile layouts can be tightened.

## P2 — Security, Ops, and Deployment

- No CI/CD pipeline or deployment recipe is checked into the repository (no `.github/workflows`, `Dockerfile`, or `vercel.json`).
- No rate limiting on auth-sensitive or upload-sensitive routes.
- No explicit CSP or security header hardening in `next.config.ts` or middleware.
- Production SMTP/provider hardening is still pending.
- No operational playbook for failed uploads, R2 bucket issues, or email delivery failures.
