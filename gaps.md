# Product Gaps

## Current Baseline

- Better Auth email/password auth, email verification, and role-based `app_users` are implemented.
- Reader-to-editor access requests, editor submission/revision flows, admin moderation, and public browse/detail pages are implemented.
- R2 presigned upload plumbing exists in code, but storage configuration still has a few operational gaps before the full flow is production-ready.

## P0 — Immediate Blockers

- R2 bucket CORS still needs to be configured for browser `PUT` uploads from local and production frontend origins, otherwise presigned PDF uploads fail.
- Public PDF delivery depends on correct R2 public access or custom-domain configuration; the app already builds public URLs, but the bucket/domain setup must be finalized.
- Storage setup needs a clear deployment checklist for `CLOUDFLARE_ACCOUNT_ID`, R2 keys, bucket name, `R2_PUBLIC_BASE_URL`, public access, and CORS.

## P1 — Repository Workflow Gaps

- Editor submission and revision UI does not let editors attach existing authors.
- Editor submission and revision UI does not let editors assign tags, even though tags are already used in browse/filter flows.
- No draft save/resume workflow yet; new items go straight into review instead of a staged draft lifecycle.
- Editors cannot delete, withdraw, or archive their own draft/submitted items.
- Moderation supports `publish` and `request_changes`, but there is no archive/unpublish/revert flow for already published items.
- Resubmission review has no dedicated change-summary or version-diff experience for admins.

## P1 — Admin Surface Gaps

- Department and tag admin pages support create/list flows, but not edit/archive/delete management.
- Admin user management has no search, filter, or sort controls.
- Admin queues have no advanced filters for request type, department, status, or date.
- Activity history exists, but there are no stronger audit filters or export tools.

## P2 — Public Repository Gaps

- Search is still database-filter based and lacks full-text indexing/ranking for scale.
- No citation export actions such as BibTeX or RIS.
- No view/download counters or repository analytics.
- Related items are basic and do not use a richer recommendation strategy.
- Public pages have basic metadata, but not full Open Graph/Twitter cards or structured data.

## P2 — UX and Robustness Gaps

- Notifications still rely heavily on query-param banners instead of a shared toast/feedback system.
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
