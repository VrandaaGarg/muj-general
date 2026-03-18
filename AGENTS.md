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
