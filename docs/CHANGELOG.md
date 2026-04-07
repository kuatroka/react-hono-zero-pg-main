# Implementation Changelog

This document tracks the implementation history of the Zero Hono React Counter uPlot project.

---

## Phase 2.2: Zero-Sync Search Implementation (2025-01-17) ✅

**Duration:** 2 hours  
**Status:** Complete

### What Was Done
- Removed custom REST API search endpoint (`api/routes/search.ts`)
- Removed PostgreSQL full-text search extensions and functions
- Removed `@tanstack/react-query` dependency (saved 20KB)
- Implemented Zero-sync ILIKE queries in `GlobalSearch.tsx`
- Added entity preloading (500 most recent entities)
- Updated `main.tsx` to initialize Zero before GlobalNav renders

### Key Changes
```typescript
// Before (Phase 2.1 - WRONG)
fetch('/api/search?q=...').then(r => r.json())

// After (Phase 2.2 - CORRECT)
z.query.entities
  .where('name', 'ILIKE', `%${query}%`)
  .limit(5)
```

### Rationale
- Follows ztunes repo pattern
- Zero handles sync automatically
- Instant client-side search
- Simpler architecture (no custom API)

### Files Changed
- `src/components/GlobalSearch.tsx` - Use Zero queries
- `src/main.tsx` - Add preloading, fix initialization order
- `api/index.ts` - Remove search route
- `package.json` - Remove @tanstack/react-query
- Deleted: `api/routes/search.ts`
- Deleted: `docker/migrations/04_add_full_text_search.sql`

### Commits
- `317df6a` - fix(phase-2.2): migrate search to Zero-sync with ILIKE, remove REST API

---

## Phase 2.1: PostgreSQL Full-Text Search (2025-01-17) ❌ ROLLED BACK

**Duration:** 2 hours  
**Status:** Rolled back in Phase 2.2

### What Was Attempted
- Added `pg_trgm` extension for fuzzy matching
- Created GIN trigram indexes
- Created `search_entities()` PostgreSQL function
- Added custom `/api/search` REST endpoint
- Added `@tanstack/react-query` dependency

### Why It Failed
- Bypassed Zero-sync entirely
- Broke entities table synchronization
- Added unnecessary complexity
- Went against Zero-sync architecture patterns
- Custom REST API defeated the purpose of Zero

### Lesson Learned
> Don't fight the framework. Zero-sync is designed for client-side queries over synced data. Custom REST APIs bypass Zero's benefits.

---

## Phase 2: Entities, Search & Navigation (2025-01-17) ✅

**Duration:** 6 hours  
**Status:** Complete

### What Was Done
- Created `entities` table (unified investors + assets)
- Generated 1000 dummy entities (500 investors + 500 assets)
- Created `GlobalNav` component with search integration
- Created `GlobalSearch` component with debouncing
- Created `EntitiesList` page with category filtering
- Created `EntityDetail` page
- Created `UserProfile` page (placeholder)
- Updated Zero schema with entities table
- Added React Router routes for all new pages
- Fixed Zero initialization order (before GlobalNav renders)

### Database Schema
```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('investor', 'asset')),
  description TEXT,
  value DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entities_category ON entities(category);
CREATE INDEX idx_entities_name ON entities(name);
```

### Files Created
- `docker/migrations/03_add_entities.sql`
- `src/components/GlobalNav.tsx`
- `src/components/GlobalSearch.tsx`
- `src/pages/EntitiesList.tsx`
- `src/pages/EntityDetail.tsx`
- `src/pages/UserProfile.tsx`
- `src/zero-client.ts`

### Files Modified
- `src/schema.ts` - Added entities table
- `src/main.tsx` - Added routes, GlobalNav, Zero initialization

### Commits
- `7b92572` - feat(phase-2): add investors/assets entities with global search
- `2be2d32` - fix: initialize Zero before GlobalNav renders
- `5444657` - fix: correct schema type for entities.created_at (number not string)
- `f4b34f3` - fix: improve search to be case-insensitive and work from any position (min 2 chars)

---

## Phase 1: Router Migration (2025-01-17) ✅

**Duration:** 4 hours  
**Status:** Complete

### What Was Done
- Removed `@tanstack/react-router` and `@tanstack/router-devtools`
- Added `react-router-dom` v7.9.4
- Refactored `main.tsx` to use React Router
- Updated `former charts demo component` navigation
- Simplified routing code (43 lines → 8 lines)
- Reduced bundle size by 20KB

### Rationale
- TanStack Router's data loaders redundant with Zero-sync
- React Router is lighter (10KB vs 30KB)
- More battle-tested at scale
- Simpler mental model (routing separate from data fetching)

### Files Changed
- `src/main.tsx` - Replaced TanStack Router with React Router
- `the former charts demo component` - Updated Link imports
- `package.json` - Updated dependencies
- `bun.lock` - Updated lockfile

### Commits
- `a999f5d` - feat(phase-1): migrate from TanStack Router to React Router

---

## Pre-Phase 1: Initial State

### What Existed
- TanStack Router for navigation
- Counter with increment/decrement (REST API)
- 10 uPlot charts with quarterly data (REST API)
- Messages demo (original Zero example)
- Zero-sync for messages/users/mediums
- JWT authentication
- Bun runtime + Hono API server
- PostgreSQL with WAL enabled

### Tech Stack
- React 19.2.0
- TanStack Router (later replaced)
- @rocicorp/zero 0.24
- Hono 4.10.0
- Bun runtime
- PostgreSQL
- uPlot 1.6.32

---

## Key Architectural Decisions

### 1. Single Entities Table (Not Separate Tables)
**Decision:** Use one `entities` table with `category` column  
**Rationale:** Simpler schema, easier to search, unified API, less code duplication

### 2. React Router (Not TanStack Router)
**Decision:** Use React Router v7 for client-side routing  
**Rationale:** Lighter bundle, data loaders redundant with Zero-sync, more battle-tested

### 3. Zero-Sync Search (Not PostgreSQL FTS)
**Decision:** Use Zero's ILIKE queries with preloading  
**Rationale:** Follows Zero-sync architecture, instant client-side search, no custom API needed

### 4. Preload 500 Entities (Not All 1000)
**Decision:** Preload 500 most recent entities at startup  
**Rationale:** Balance between instant search and startup time, covers most common searches

### 5. Order by created_at DESC (Not Popularity)
**Decision:** Preload newest entities first  
**Rationale:** Simple to implement, reasonable assumption (recent = relevant), can add analytics later

---

## Bundle Size History

| Phase | Bundle Size | Gzipped | Change |
|-------|-------------|---------|--------|
| Pre-Phase 1 | ~587KB | ~202KB | Baseline |
| Phase 1 | ~567KB | ~182KB | -20KB (TanStack Router removed) |
| Phase 2.1 | ~587KB | ~192KB | +20KB (React Query added) |
| Phase 2.2 | ~567KB | ~182KB | -20KB (React Query removed) |

**Final:** 567KB (182KB gzipped)

---

## Success Metrics

### Phase 1
- ✅ Counter increments/decrements work
- ✅ All 10 charts render correctly
- ✅ Navigation between home and counter works
- ✅ No console errors
- ✅ Bundle size reduced by 20KB

### Phase 2
- ✅ 1000 entities in database (500 investors + 500 assets)
- ✅ Search finds entities with 2+ characters
- ✅ Case-insensitive substring matching works
- ✅ Search shows category badges
- ✅ Click result navigates to detail page
- ✅ List pages show 50 rows with filtering
- ✅ Detail pages display full entity information
- ✅ Zero-sync keeps data in sync
- ✅ No console errors
- ✅ Build successful

---

## References

- **Zero Documentation:** https://zero.rocicorp.dev
- **ZTunes Repo:** https://github.com/rocicorp/ztunes (search pattern reference)
- **React Router:** https://reactrouter.com
- **Hono:** https://hono.dev
- **uPlot:** https://github.com/leeoniya/uPlot

---

**For current state and architecture, see [CURRENT-STATE.md](./CURRENT-STATE.md)**
