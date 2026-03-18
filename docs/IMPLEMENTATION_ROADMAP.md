# MUJ General - Implementation Roadmap

**Date**: March 18, 2026  
**Status**: Codebase Inspection Summary

This document identifies what exists, what's missing, and the implementation plan for:
1. **Public Repository Pages** (browse, search, detail views)
2. **Author/Department Pages** (public profiles)
3. **Admin Management** (users, departments, settings)
4. **Editor Revision Flow** (changes requested → resubmit)

---

## Current State Summary

### ✅ What Exists

#### Database Schema (Complete)
- **Core tables**: `user`, `session`, `account`, `verification` (Better Auth)
- **App tables**: `app_users`, `departments`, `authors`, `tags`
- **Research tables**: `research_items`, `item_versions`, `files`, `research_item_authors`, `research_item_tags`
- **Workflow tables**: `editor_access_requests`, `moderation_decisions`, `activity_logs`
- **Enums**: All statuses, roles, file kinds, research types defined
- **Relations**: All Drizzle relations configured
- **Indexes**: Strategic indexes on status, department, type, year, slug

#### Authentication & Authorization
- Better Auth integration with email/password credentials
- Email verification flow (`/verify-email`)
- Session management with `requireAppSession()` and `requireRole()`
- Permission checks in `permissions.ts` (verified users only for elevated roles)
- Role-based access control: `reader`, `editor`, `admin`

#### Editor Workflow (Partial)
- Editor submission form (`EditorSubmissionForm`)
- Research submission action (`submitResearchSubmission`)
- PDF upload to R2 via S3-compatible API
- Item versioning (v1 created on submission)
- Moderation decision recording
- Activity logging

#### Admin Workflow (Partial)
- Admin dashboard (`/admin`)
- Pending editor access requests display
- Pending research moderation display
- Review actions for both (approve/reject requests, publish/request changes)
- Moderation decision recording

#### Database Queries (14 functions)
- `getAppUserById()` - user with role and department
- `listDepartments()` - all departments
- `getLatestEditorAccessRequestForUser()` - latest request status
- `hasPendingEditorAccessRequest()` - check for pending
- `createEditorAccessRequest()` - create new request
- `listPendingEditorAccessRequests()` - admin view
- `countPendingEditorAccessRequests()` - count pending
- `reviewEditorAccessRequest()` - approve/reject with transaction
- `listResearchItemsForEditor()` - editor's submissions
- `listPendingResearchModerationItems()` - admin moderation queue
- `countPendingResearchModerationItems()` - count pending
- `reviewResearchSubmission()` - publish/request changes with transaction
- `logActivity()` - audit trail
- `ensureAppUser()` - create app_user on first login

#### Frontend Components
- `SiteHeader` - navigation with role-aware links
- `HomeLanding` - hero landing page
- `EditorSubmissionForm` - form for new submissions
- `EditorSubmissionsList` - editor's items list
- `AdminPendingRequests` - request approval UI
- `AdminResearchModeration` - moderation queue UI
- `EditorAccessRequestCard` - reader request status
- UI components: button, card, input, textarea, label, alert

#### Routes
- `/` - home landing
- `/sign-up` - signup
- `/sign-in` - signin
- `/verify-email` - email verification
- `/dashboard` - user dashboard (all roles)
- `/editor` - editor panel (editor/admin)
- `/admin` - admin panel (admin only)
- `/api/auth/[...all]` - Better Auth handler

---

## ❌ What's Missing

### 1. Public Repository Pages

#### Routes Needed
- `GET /research` - browse/search published items (paginated, filterable)
- `GET /research/[slug]` - detail page for published item
- `GET /departments` - list all departments
- `GET /departments/[slug]` - department detail with items
- `GET /authors/[id]` - author profile with their items
- `GET /tags/[slug]` - tag page with filtered items

#### Database Queries Needed
- `getPublishedResearchItems()` - paginated, with filters (department, type, year, tag)
- `getResearchItemBySlug()` - with authors, files, tags, department
- `getDepartmentBySlug()` - with published items count
- `getPublishedItemsByDepartment()` - paginated
- `getAuthorById()` - with linked user, published items
- `getPublishedItemsByAuthor()` - paginated
- `getPublishedItemsByTag()` - paginated
- `searchPublishedItems()` - full-text search on title/abstract

#### Components Needed
- `ResearchBrowser` - grid/list with filters, pagination
- `ResearchDetail` - full item view with authors, files, metadata
- `DepartmentCard` - department summary
- `AuthorCard` - author summary
- `FileDownloadButton` - secure file access
- `ResearchFilters` - sidebar/modal filters
- `SearchBar` - search input with suggestions

#### Features
- Pagination (10-20 items per page)
- Filtering by: department, type, year, tag
- Sorting by: date, title, relevance
- Full-text search on title/abstract
- File download tracking (optional)
- Breadcrumbs for navigation
- SEO metadata (title, description, og:image)

### 2. Author/Department Pages

#### Routes Needed
- `GET /departments/[slug]` - public department page
- `GET /authors/[id]` - public author profile

#### Database Queries Needed
- `getDepartmentBySlug()` - with stats (item count, recent items)
- `getPublishedItemsByDepartment()` - paginated
- `getAuthorById()` - with stats
- `getPublishedItemsByAuthor()` - paginated

#### Components Needed
- `DepartmentPage` - header, stats, items list
- `AuthorPage` - profile, stats, items list
- `AuthorBio` - display name, affiliation, ORCID link

#### Features
- Department description and metadata
- Author affiliation and ORCID link
- Item count and recent items
- Linked user profile (if author has account)

### 3. Admin Management

#### Routes Needed
- `GET /admin/users` - user list with roles
- `GET /admin/users/[id]` - user detail
- `POST /admin/users/[id]/role` - change user role
- `GET /admin/departments` - department management
- `POST /admin/departments` - create department
- `PUT /admin/departments/[id]` - edit department
- `DELETE /admin/departments/[id]` - delete department
- `GET /admin/settings` - platform settings

#### Database Queries Needed
- `listAllUsers()` - paginated with role, department
- `getUserById()` - full profile
- `updateUserRole()` - with validation and logging
- `listAllDepartments()` - with item count
- `createDepartment()` - with slug generation
- `updateDepartment()` - name, description
- `deleteDepartment()` - with cascade check
- `getSystemStats()` - total users, items, departments

#### Components Needed
- `UserManagementTable` - list with role selector
- `UserDetailModal` - view/edit user
- `DepartmentManagementTable` - list with actions
- `DepartmentForm` - create/edit
- `SystemStatsCards` - overview metrics

#### Features
- User list with pagination and search
- Role assignment (reader → editor → admin)
- Department CRUD
- Bulk actions (optional)
- Audit trail view
- System statistics dashboard

### 4. Editor Revision Flow

#### Routes Needed
- `POST /editor/[slug]/revise` - create new version after changes requested
- `GET /editor/[slug]/revisions` - view revision history
- `POST /editor/[slug]/resubmit` - resubmit after revision

#### Database Queries Needed
- `getResearchItemWithVersions()` - item + all versions
- `createNewVersion()` - increment version number
- `getLatestModerationDecision()` - check if changes requested
- `updateResearchItemStatus()` - draft → submitted

#### Components Needed
- `RevisionForm` - edit title, abstract, files
- `RevisionHistory` - timeline of versions and decisions
- `ModerationFeedback` - display admin comments
- `ResubmitButton` - conditional on changes_requested status

#### Features
- View moderation feedback/comments
- Create new version with change summary
- Upload new/updated files
- Resubmit for review
- Version history timeline
- Diff view (optional)

---

## Schema Gaps & Enhancements

### Minor Gaps
1. **No full-text search index** - add GIN index on `research_items(title, abstract)`
2. **No view count tracking** - optional: add `views` table for analytics
3. **No download tracking** - optional: add `downloads` table
4. **No author profile fields** - consider adding `bio`, `website_url` to `authors`
5. **No department image/logo** - consider adding `image_url` to `departments`

### Recommended Additions (Not MVP)
- `collections` table for curated groups
- `bookmarks` table for saved items
- `citations` table for reference tracking
- `metrics` table for views/downloads

---

## Implementation Priority

### Phase 1: Public Discovery (High Priority)
1. Add database queries for published items
2. Create `/research` browse page with filters
3. Create `/research/[slug]` detail page
4. Add search functionality
5. Create `/departments/[slug]` page

### Phase 2: Editor Revisions (High Priority)
1. Add revision form component
2. Add `createNewVersion()` query
3. Add `/editor/[slug]/revise` route
4. Add revision history view
5. Update submission status logic

### Phase 3: Admin Management (Medium Priority)
1. Add user management queries
2. Create `/admin/users` page
3. Create `/admin/departments` page
4. Add role change action
5. Add department CRUD actions

### Phase 4: Author Pages (Medium Priority)
1. Create `/authors/[id]` page
2. Create `/departments/[slug]` enhanced page
3. Add author profile linking

---

## File Structure to Create

```
src/
├── app/
│   ├── research/
│   │   ├── page.tsx                 # Browse/search
│   │   ├── [slug]/
│   │   │   └── page.tsx             # Detail view
│   │   └── layout.tsx
│   ├── departments/
│   │   ├── page.tsx                 # List
│   │   ├── [slug]/
│   │   │   └── page.tsx             # Detail
│   │   └── layout.tsx
│   ├── authors/
│   │   ├── [id]/
│   │   │   └── page.tsx             # Profile
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── users/
│   │   │   ├── page.tsx             # User list
│   │   │   └── [id]/
│   │   │       └── page.tsx         # User detail
│   │   ├── departments/
│   │   │   └── page.tsx             # Department management
│   │   └── settings/
│   │       └── page.tsx             # Settings
│   └── editor/
│       └── [slug]/
│           ├── revise/
│           │   └── page.tsx         # Revision form
│           └── revisions/
│               └── page.tsx         # History
├── components/
│   ├── research-browser.tsx
│   ├── research-detail.tsx
│   ├── research-filters.tsx
│   ├── department-page.tsx
│   ├── author-page.tsx
│   ├── user-management-table.tsx
│   ├── department-management-table.tsx
│   ├── revision-form.tsx
│   ├── revision-history.tsx
│   └── moderation-feedback.tsx
└── lib/
    ├── db/
    │   └── queries.ts               # Add ~15 new queries
    └── actions/
        ├── research.ts              # Add revision actions
        └── admin.ts                 # Add user/dept actions
```

---

## Key Implementation Notes

### Public Routes (No Auth Required)
- `/research` - browse published items
- `/research/[slug]` - view published item
- `/departments` - list departments
- `/departments/[slug]` - view department
- `/authors/[id]` - view author profile
- `/tags/[slug]` - view tag page

### Protected Routes (Auth Required)
- `/editor/[slug]/revise` - requires editor role
- `/admin/users` - requires admin role
- `/admin/departments` - requires admin role

### Database Query Patterns
- Always filter by `status = 'published'` for public routes
- Use pagination with `limit` and `offset`
- Include related data (authors, tags, files) in single query
- Use indexes on `status`, `department_id`, `slug`

### File Download Security
- Verify user has access (published or owner)
- Use presigned URLs from R2 for direct downloads
- Log downloads in activity_logs (optional)

### Search Implementation
- Use PostgreSQL full-text search (`tsvector`)
- Index on `title` and `abstract`
- Support filtering + search together
- Rank results by relevance

---

## Existing Query Reference

### Available Queries (14 total)
```typescript
// User & Auth
getAppUserById(userId)
ensureAppUser(userId)
listDepartments()

// Editor Access Requests
getLatestEditorAccessRequestForUser(userId)
hasPendingEditorAccessRequest(userId)
createEditorAccessRequest(params)
listPendingEditorAccessRequests()
countPendingEditorAccessRequests()
reviewEditorAccessRequest(params)

// Research Items
listResearchItemsForEditor(userId)
listPendingResearchModerationItems()
countPendingResearchModerationItems()
reviewResearchSubmission(params)

// Activity
logActivity(params)
```

### New Queries Needed (~20)
```typescript
// Public Discovery
getPublishedResearchItems(filters, pagination)
getResearchItemBySlug(slug)
searchPublishedItems(query, filters, pagination)
getPublishedItemsByDepartment(deptId, pagination)
getPublishedItemsByAuthor(authorId, pagination)
getPublishedItemsByTag(tagId, pagination)

// Department
getDepartmentBySlug(slug)
getDepartmentStats(deptId)
listAllDepartments()
createDepartment(params)
updateDepartment(id, params)
deleteDepartment(id)

// Author
getAuthorById(id)
getAuthorStats(authorId)

// User Management
listAllUsers(pagination)
getUserById(id)
updateUserRole(userId, newRole)

// System
getSystemStats()
```

---

## Testing Considerations

### Public Routes
- Test published items appear
- Test unpublished items don't appear
- Test filters work correctly
- Test pagination
- Test search

### Admin Routes
- Test role-based access
- Test user role changes
- Test department CRUD
- Test audit logging

### Editor Routes
- Test revision creation
- Test version incrementing
- Test resubmission
- Test moderation feedback display

---

## Performance Considerations

1. **Pagination**: Always paginate public lists (10-20 items)
2. **Indexes**: Ensure indexes on `status`, `department_id`, `slug`
3. **Caching**: Consider ISR for department/author pages
4. **Search**: Use full-text search with GIN index
5. **N+1 Queries**: Use Drizzle relations to load authors/tags in single query

---

## Next Steps

1. **Immediate**: Create database queries for public discovery
2. **Week 1**: Build public research browse and detail pages
3. **Week 2**: Add editor revision flow
4. **Week 3**: Build admin user/department management
5. **Week 4**: Polish, testing, and deployment

---

## Summary Table

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Public browse/search | ❌ Missing | High | Medium |
| Public detail page | ❌ Missing | High | Small |
| Department pages | ❌ Missing | Medium | Small |
| Author pages | ❌ Missing | Medium | Small |
| Editor revisions | ❌ Missing | High | Medium |
| Admin user mgmt | ❌ Missing | Medium | Medium |
| Admin dept mgmt | ❌ Missing | Medium | Small |
| Admin settings | ❌ Missing | Low | Small |
| Database schema | ✅ Complete | - | - |
| Auth & roles | ✅ Complete | - | - |
| Editor submission | ✅ Partial | - | - |
| Admin moderation | ✅ Partial | - | - |

