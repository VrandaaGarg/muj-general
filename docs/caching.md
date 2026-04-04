# Caching Strategy

This project now uses Next.js server-side caching for public journal and research pages.

The goal is simple:

1. Reduce repeated database work on page navigation.
2. Keep public pages fast when users revisit the same content.
3. Keep content fresh after admin or editor updates.

## What Kind of Caching We Use

This is not browser-only caching and not full-page static export.

We use:

1. `unstable_cache(...)` for server-side data caching.
2. `revalidateTag(...)` for targeted cache invalidation after writes.
3. `loading.tsx` route skeletons for perceived performance during navigation.

This is best described as application-level server caching for read-heavy public content.

## Where the Cache Lives

The cache entry points are defined in:

`src/lib/db/public-cache.ts`

That file wraps expensive public read queries from `src/lib/db/queries.ts`.

## Cached Queries

The following public reads are cached:

1. Public journals list
2. Public journal detail by slug
3. Published research list
4. Published research count
5. Published research filter options
6. Published research detail by slug
7. Related published research items
8. More items from the same authors

These wrappers are used by:

1. `src/app/page.tsx`
2. `src/app/research/page.tsx`
3. `src/app/research/[slug]/page.tsx`
4. `src/app/journals/page.tsx`
5. `src/app/journals/[slug]/page.tsx`

## Cache Tags

We currently use these public cache tag groups:

1. `research`
2. `research:filters`
3. `journals`

Detail pages also use slug-specific tags:

1. `research:<slug>`
2. `journals:<slug>`

This lets us invalidate broad lists or a more specific detail entry when needed.

## How It Works

### Read flow

For a route like `/research`:

1. The page calls a cached wrapper such as `getCachedPublishedResearchItems(...)`.
2. On the first request, the DB query runs normally.
3. Next.js stores the result in the server cache.
4. Later requests for the same cache key can reuse the cached result instead of re-running the full query.

For a detail page like `/research/[slug]` or `/journals/[slug]`:

1. The page and `generateMetadata()` both use the same cached getter.
2. This avoids repeating the same expensive detail query during the same route lifecycle.

### Write flow

When admin or editor actions update public content:

1. The server action still uses `revalidatePath(...)` where needed.
2. It now also calls `revalidateTag(...)` through helper functions.
3. The affected cache entries are marked stale.
4. The next request rebuilds the cache with fresh data.

## Invalidation Helpers

These helpers are defined in `src/lib/db/public-cache.ts`:

1. `revalidatePublicResearchCache(slug?)`
2. `revalidatePublicJournalCache(slug?)`

They are used from:

1. `src/lib/actions/research.ts`
2. `src/lib/actions/admin.ts`

## Why This Fits MUJ General

This caching works well for MUJ General because the public repository is read-heavy:

1. Many users browse journals and research.
2. Public content does not change every second.
3. Admin and editor updates happen much less often than public reads.
4. The same list and detail pages are revisited often.

This is the ideal shape for server-side cached reads with explicit invalidation.

## Where This Type of Caching Works Best

This approach is strong in projects such as:

1. Blogs and editorial sites
2. Documentation sites
3. Research repositories
4. Public content catalogs
5. Marketplace browse pages
6. Public directories and profile listings

These systems usually have:

1. High read volume
2. Low or moderate write volume
3. Repeated access to the same data
4. No requirement for second-by-second freshness everywhere

## Where It Is Less Effective

This should not be the main performance strategy for highly real-time or highly personalized systems such as:

1. Live chat
2. Trading dashboards
3. Real-time collaborative editors
4. Per-user live task queues
5. Rapidly changing private dashboards

In those cases, cache invalidation happens too often or data is too user-specific.

## Skeleton Loaders

Caching improves actual backend work reuse.

Skeleton loaders improve perceived speed.

We added route-level loaders at:

1. `src/app/research/loading.tsx`
2. `src/app/research/[slug]/loading.tsx`
3. `src/app/journals/loading.tsx`
4. `src/app/journals/[slug]/loading.tsx`

Shared skeleton markup lives in:

`src/components/public-route-skeletons.tsx`

These loaders appear while route content is still resolving.

## Query Optimization Included in This Pass

Along with caching, we also reduced unnecessary work in the published research queries.

In `src/lib/db/queries.ts`:

1. Research list and count no longer always join tag tables.
2. Tag filtering now uses a targeted `EXISTS` subquery.

This helps the normal `/research` path do less work, especially when the user is not filtering by tags.

## Header Optimization Included in This Pass

The shared site header previously fetched the user role from `/api/auth/app-role` with `cache: "no-store"` during navigation.

We now keep the resolved role in local storage per user inside:

`src/components/site-header.tsx`

This reduces repeated client-side role fetches across journal and research navigation.

## Difference Between the Main Tools

### `unstable_cache(...)`

Use this to cache expensive server-side reads.

Good for:

1. DB queries
2. Expensive assembled data
3. Public read-heavy server functions

### `revalidateTag(...)`

Use this to invalidate cache entries by topic or data group.

Good for:

1. Research list/detail cache invalidation
2. Journal list/detail cache invalidation
3. Shared cache invalidation after content updates

### `revalidatePath(...)`

Use this when a route path needs to be revalidated.

Good for:

1. Existing route refresh behavior
2. Specific page-level refreshes
3. Compatibility with the rest of the current action layer

In this repo, `revalidatePath(...)` and `revalidateTag(...)` are used together.

## Mental Model

Think of the flow like this:

1. A user visits a public page.
2. The server fetches the data and caches it.
3. The next user asking for the same data can reuse that cached result.
4. An admin or editor changes content.
5. The related cache tag is invalidated.
6. The next visit rebuilds the cached result with fresh data.

## Tradeoffs

Benefits:

1. Faster repeated navigation
2. Lower DB load for repeated public reads
3. Cleaner separation between public read caching and write invalidation
4. Better perceived speed with skeletons

Tradeoffs:

1. First request after invalidation is still a cold request
2. Cache keys and invalidation need discipline
3. Over-caching dynamic user-specific data would be a mistake

## When Adding New Cached Public Reads

If you add another public read query:

1. Keep the raw DB logic in `src/lib/db/queries.ts`.
2. Add a cached wrapper in `src/lib/db/public-cache.ts`.
3. Give it stable inputs and stable cache keys.
4. Attach the correct tags.
5. Invalidate those tags from the write path that changes the data.

## What We May Add Next

The next likely performance step is database indexing for hot public query patterns, especially for:

1. Published research ordered by publish date
2. Journal-scoped published research
3. Issue-scoped published research
4. Tag-filtered research

Caching reduces repeated work.

Indexes reduce the cost of the underlying database work itself, especially on cache misses and after invalidation.
