# Product Gaps

## Current Baseline

- Better Auth email/password auth, email verification, and role-based `app_users` are implemented.
- Reader-to-editor access requests, editor submission/revision flows, admin moderation, and public browse/detail pages are implemented.
- R2 presigned upload plumbing exists in code, but storage configuration still has a few operational gaps before the full flow is production-ready.

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

## P0 — Immediate Blockers

- R2 bucket CORS still needs to be configured for browser `PUT` uploads from local and production frontend origins.
- Public PDF delivery depends on correct R2 public access or custom-domain configuration.
- Storage setup needs a deployment checklist for `CLOUDFLARE_ACCOUNT_ID`, R2 keys, bucket name, `R2_PUBLIC_BASE_URL`, public access, and CORS.

## P1 — Remaining

- Admin version-diff UX for resubmission review — field-by-field and file-level comparison between current and previous versions on the admin review page. *(in progress)*

## P2 — Public Repository Gaps

- Search is still database-filter based and lacks full-text indexing/ranking for scale.
- No citation export actions such as BibTeX or RIS.
- No view/download counters or repository analytics.
- Related items are basic and do not use a richer recommendation strategy.
- Public pages have basic metadata, but not full Open Graph/Twitter cards or structured data.

## P2 — UX and Robustness Gaps

- No custom `error.tsx` / `not-found.tsx` pages for major surfaces.
- Loading and empty-state polish is inconsistent across admin/editor flows.
- Email templates are functional but still basic.
- Some admin/editor mobile layouts can be tightened.

## P2 — Security, Ops, and Deployment

- No CI/CD pipeline or deployment recipe is checked into the repository.
- No rate limiting on auth-sensitive or upload-sensitive routes.
- No explicit CSP/security header hardening.
- Production SMTP/provider hardening is still pending.
- No operational playbook for failed uploads, R2 bucket issues, or email delivery failures.
