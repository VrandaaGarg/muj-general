<!-- Added: 2026-03-17 -->
## Core Stack
The muj-general college website uses Next.js for the application, PostgreSQL for the database, Better Auth for authentication, and S3-compatible object storage for PDFs and uploaded assets. Plan features and metadata model before implementation.

<!-- Added: 2026-03-17 -->

<!-- Added: 2026-03-17 -->
## Storage
Use Cloudflare R2 for uploaded PDFs and assets, and access it through the standard S3-compatible API so the storage layer remains portable across providers.

## Repository Data Model
For muj-general, keep user roles simple with a single `role` field defaulting to `reader`, keep `department_id` nullable on users, separate login users from content authors, and use versioned `research_items` plus S3-backed `files` for repository submissions.

<!-- Added: 2026-03-17 -->
## Frontend Stack
Use Tailwind CSS for styling, Lucide for icons, and Framer Motion for animations in the muj-general website.

<!-- Added: 2026-03-17 -->
## UI Components
Use shadcn/ui as the component library for the muj-general frontend, alongside Tailwind CSS, Lucide, and Framer Motion.

<!-- Added: 2026-03-17 -->
## Authentication
Use Better Auth built-in email/password credentials with email verification. Only verified users should be eligible for elevated roles such as `editor` and `admin`.

<!-- Added: 2026-03-17 -->
## Auth Protection
For muj-general, use `proxy.ts` only for optimistic redirects on protected routes. Enforce real access control server-side with session helpers that combine Better Auth session data with the `app_users` role record.

<!-- Added: 2026-03-17 -->
## Editor Access Workflow
For muj-general, verified readers request editor access through `editor_access_requests`. Keep at most one pending request per user, let admins approve or reject requests with review metadata, and promote approved users by updating `app_users.role` to `editor`.

<!-- Added: 2026-03-18 -->
## Journals
Implement journals as a publication layer on top of `research_items`, not a separate article system. Use `journals`, `journal_volumes`, and `journal_issues`, and keep optional `research_items.journal_id` + `research_items.journal_issue_id` to support both online-first and issue-assigned publication.

<!-- Added: 2026-03-19 -->
## Remaining UI/UX Gaps
1. **Theme consistency**: Replace all hardcoded `amber-600/700`, `rose-600/700`, `violet-600/700` with `primary` CSS variable. Highest-impact files: `admin-version-diff.tsx`, `admin-journals-list.tsx`, `journal-detail-client.tsx`, `journals/page.tsx`, `editor-access-request-card.tsx`, `verify-email-content.tsx`, `admin-pending-requests.tsx`, `admin-users-list.tsx`, `admin-tags-list.tsx`, `admin-departments-list.tsx`, `admin-moderation-history.tsx`, `admin-research-moderation.tsx`, `admin-research-moderation-full.tsx`, `editor-submissions-list.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`, `admin/page.tsx`, `admin/review/[id]/page.tsx`, `admin/history/page.tsx`, `admin/users/page.tsx`, `admin/journals/page.tsx`, `admin/tags/page.tsx`, `admin/departments/page.tsx`, `ui/confirm-dialog.tsx`.
2. **Admin subpage breadcrumbs + width**: Convert `ArrowLeft` back-links to full `Home > Admin > Page` breadcrumbs and widen from `max-w-3xl`/`max-w-4xl` to `max-w-6xl` with `lg:px-20` on: `/admin/users`, `/admin/history`, `/admin/departments`, `/admin/tags`, `/admin/journals`, `/admin/review/[id]`.
3. **Native selects → AnimatedSelect**: Replace 2 remaining native `<select>` elements in `admin-journals-list.tsx` (journal status + volume selection) with `AnimatedSelect`.
4. **Section heading hierarchy**: Standardize section headings across admin/editor/journal pages — use `text-lg font-semibold tracking-tight text-foreground` for primary section titles instead of the old `text-xs font-semibold uppercase` or `text-sm font-semibold` patterns. Key files: `author-profile.tsx`, `admin/review/[id]/page.tsx`, `research-filters.tsx`, `admin-review-actions.tsx`, `journal-detail-client.tsx`, `editor-submissions-list.tsx`, `admin-pending-requests.tsx`, `admin-research-moderation.tsx`, `admin-research-moderation-full.tsx`.
5. **Editor form localStorage persistence**: Add localStorage draft persistence to `editor-submission-form.tsx` and `editor-revision-form.tsx` so form fields survive page reloads. Save on input change (debounced), restore on mount, clear on successful submission.
