# Migrate to ZTunes Architecture

## Why

The current application architecture violates Zero-sync best practices documented in our own `docs/ZERO-SYNC-PATTERNS.md`. Specifically:

1. **Mixed Data Access Patterns**: Some data accessed via REST API (`/apithe former charts demo route`, `/api/quarters`), some via Zero-sync (entities, messages)
2. **Manual Schema Maintenance**: `src/schema.ts` must be manually kept in sync with PostgreSQL schema, leading to potential drift
3. **No Server-Side Validation**: Mutations happen directly from client without validation or permission enforcement
4. **Security Vulnerabilities**: Client can spoof user IDs and bypass business logic
5. **Violates Local-First Philosophy**: REST endpoints bypass Zero's caching, reactive updates, and offline capabilities

The ZTunes reference implementation (https://github.com/rocicorp/ztunes) demonstrates the correct architecture for production Zero-sync applications, built by Rocicorp (creators of Zero) as an authoritative example.

**Key Problems Solved:**
- **Single Source of Truth**: Drizzle ORM schema → auto-generated Zero schema (no manual sync)
- **Server-Side Validation**: All mutations validated with Zod schemas before execution
- **Auth-Aware Mutations**: User context from session enforced server-side (can't be spoofed)
- **Type Safety**: Full type safety from database → Drizzle → Zero → Client
- **Pure Zero-Sync**: All data access through Zero, no REST API duplication
- **Production Patterns**: Proper auth integration, permission enforcement, query optimization

## What Changes

### Core Technology Stack Migration

**BREAKING**: Complete architectural overhaul with new core technologies:

1. **Replace Hono → TanStack Start**
   - Remove Hono API server (`api/` directory)
   - Add TanStack Start with file-based API routes
   - Migrate React Router → TanStack Router (required by TanStack Start)
   - Keep Bun as runtime (replace all Node.js usage)

2. **Add Drizzle ORM + drizzle-zero**
   - Install Drizzle ORM for PostgreSQL
   - Define schema in `db/schema.ts` (single source of truth)
   - Install drizzle-zero for automatic Zero schema generation
   - Remove manual `src/schema.ts` (replaced by generated `zero/schema.gen.ts`)

3. **Add Better Auth**
   - Replace JWT-based auth with Better Auth
   - Session-based authentication with cookie forwarding
   - Integrate with Zero endpoints for user context

4. **Implement Custom Mutators**
   - Create `zero/mutators.ts` with server-side validation
   - Move counter logic from REST API to mutators
   - Add Zod schemas for mutation validation
   - Enforce user context from session (can't be spoofed)

5. **Implement Synced Queries**
   - Create `zero/queries.ts` with validated query definitions
   - Add Zod validation for query parameters
   - Replace direct Zero queries with synced queries

6. **Reconfigure Zero Cache**
   - Change from direct PostgreSQL access to app endpoint calls
   - Configure `ZERO_MUTATE_URL` and `ZERO_GET_QUERIES_URL`
   - Enable cookie forwarding for auth context

### Removed Components

**BREAKING**: The following will be removed:
- `api/` directory (Hono server)
- `api/routesthe former charts demo route.ts` (REST endpoint)
- `api/routes/quarters.ts` (REST endpoint)
- `src/servicesthe former charts demo route.ts` (REST API client)
- `src/services/quarters.ts` (REST API client)
- `src/schema.ts` (manual schema definition)
- JWT-based authentication (`jose` library)

### New Components

- `db/schema.ts` - Drizzle ORM schema (source of truth)
- `zero/schema.gen.ts` - Auto-generated Zero schema (never manually edited)
- `zero/mutators.ts` - Custom mutators with server-side validation
- `zero/queries.ts` - Synced queries with Zod validation
- `app/routes/api/zero/get-queries.ts` - TanStack Start API route
- `app/routes/api/zero/mutate.ts` - TanStack Start API route
- `app/routes/api/auth/[...all].ts` - Better Auth API route
- `lib/auth.ts` - Better Auth configuration
- `drizzle.config.ts` - Drizzle configuration
- `scripts/generate-zero-schema.ts` - Schema generation script

### Modified Components

- `package.json` - Replace dependencies, add new scripts
- `.env` - Update Zero cache configuration
- `docker/docker-compose.yml` - Update environment variables
- All React components using counter/quarters data - Use Zero mutations/queries
- `src/components/GlobalSearch.tsx` - Use synced queries
- `src/main.tsx` - Integrate TanStack Router and Better Auth

## Impact

### Affected Specs

**New Capabilities:**
- `drizzle-schema-management` - Drizzle ORM schema as single source of truth
- `zero-custom-mutators` - Server-side validated mutations with auth context
- `zero-synced-queries` - Type-safe validated queries
- `better-auth-integration` - Session-based authentication
- `tanstack-start-api-routes` - API routes for Zero endpoints

**Removed Capabilities:**
- Hono API server
- JWT-based authentication
- REST API endpoints for data queries

### Affected Code

**Deleted:**
- `api/` (entire directory)
- `src/servicesthe former charts demo route.ts`
- `src/services/quarters.ts`
- `src/schema.ts`

**Created:**
- `db/schema.ts`
- `zero/schema.gen.ts`
- `zero/mutators.ts`
- `zero/queries.ts`
- `app/routes/api/zero/get-queries.ts`
- `app/routes/api/zero/mutate.ts`
- `app/routes/api/auth/[...all].ts`
- `lib/auth.ts`
- `drizzle.config.ts`
- `scripts/generate-zero-schema.ts`

**Modified:**
- `package.json`
- `.env`
- `docker/docker-compose.yml`
- `src/main.tsx`
- `the former charts demo component`
- `src/components/GlobalSearch.tsx`
- All route components (migrate to TanStack Router)

### Breaking Changes

**BREAKING**: This is a complete architectural rewrite. All breaking changes:

1. **API Server**: Hono → TanStack Start (different API route structure)
2. **Router**: React Router → TanStack Router (different routing API)
3. **Auth**: JWT → Better Auth (different auth flow, session-based)
4. **Schema**: Manual → Auto-generated (different schema definition location)
5. **Data Access**: Mixed (REST + Zero) → Pure Zero-sync (no REST endpoints)
6. **Mutations**: Direct client mutations → Server-validated custom mutators
7. **Queries**: Direct Zero queries → Synced queries with validation

### Benefits

1. **Security**: Server-side validation and auth enforcement prevent client spoofing
2. **Maintainability**: Auto-generated schemas eliminate manual sync issues
3. **Best Practices**: Follows Zero creators' reference implementation patterns
4. **Type Safety**: Full type safety from database to client
5. **Scalability**: Proper patterns for growing applications
6. **Developer Experience**: Single source of truth, automated schema generation
7. **Production Ready**: Proven patterns from Rocicorp's reference app

### Dependencies

**Added:**
- `drizzle-orm` - PostgreSQL ORM
- `drizzle-zero` - Zero schema generator
- `better-auth` - Authentication library
- `@tanstack/start` - Full-stack React framework
- `@tanstack/react-router` - Type-safe routing
- `zod` - Schema validation
- `vinxi` - Vite-powered server framework (TanStack Start dependency)

**Removed:**
- `hono` - Edge runtime framework
- `jose` - JWT library
- `react-router` - Client-side routing

**Kept:**
- `@rocicorp/zero` - Real-time sync framework
- `uplot` - Charting library
- `daisyui` + `tailwindcss` - Styling
- All React dependencies

### Migration Path

**Estimated Effort**: 2-3 weeks for full migration

**Phase 1: Foundation (Week 1)**
1. Install Drizzle ORM and drizzle-zero
2. Define schema in `db/schema.ts`
3. Generate Zero schema with drizzle-zero
4. Test schema compatibility with existing PostgreSQL data
5. Install TanStack Start and migrate routing

**Phase 2: Auth & API Routes (Week 1-2)**
1. Install Better Auth
2. Configure session-based authentication
3. Create TanStack Start API routes for Zero endpoints
4. Migrate JWT auth to Better Auth sessions
5. Test auth flow and cookie forwarding

**Phase 3: Mutators & Queries (Week 2)**
1. Implement custom mutators in `zero/mutators.ts`
2. Add server-side validation with Zod
3. Move counter logic from REST API to mutators
4. Implement synced queries in `zero/queries.ts`
5. Remove REST API endpoints

**Phase 4: Client Migration (Week 2-3)**
1. Update all components to use custom mutators
2. Replace direct queries with synced queries
3. Update GlobalSearch to use synced queries
4. Remove REST API client services
5. Test all functionality

**Phase 5: Zero Cache Reconfiguration (Week 3)**
1. Update `.env` with Zero endpoint URLs
2. Configure cookie forwarding
3. Test Zero cache with app endpoints
4. Remove direct PostgreSQL connection from Zero cache
5. Verify real-time sync works correctly

**Phase 6: Cleanup & Documentation (Week 3)**
1. Remove Hono server code
2. Remove JWT auth code
3. Remove manual schema definition
4. Update documentation
5. Update OpenSpec project.md
6. Final testing and validation

### Testing Considerations

**Critical Tests:**
- Server-side validation prevents invalid mutations
- Auth context properly enforced (can't spoof user ID)
- Schema generation produces correct Zero schema
- All existing functionality works (counter, charts, search, messages)
- Real-time sync works across multiple clients
- Cookie forwarding works with Zero cache
- Better Auth session management works correctly

**Regression Tests:**
- Counter increment/decrement
- Quarterly charts render correctly
- Global search works with ILIKE queries
- Messages CRUD operations
- Multi-tab sync verification
- Offline functionality (if applicable)

### Rollback Plan

If migration fails:
1. Revert to previous commit before migration started
2. Keep PostgreSQL data (schema compatible)
3. Restore Hono API server
4. Restore JWT auth
5. Restore manual schema definition

**Note**: This is a one-way migration. Once completed and deployed, rolling back requires significant effort.

### Future Enhancements

After migration is complete:
1. Add more custom mutators for complex business logic
2. Implement permission enforcement in mutators
3. Add query result caching strategies
4. Optimize synced queries for performance
5. Add mutation batching for bulk operations
6. Implement optimistic UI updates
7. Add server-side computed fields
8. Implement audit logging in mutators

### References

- **ZTunes Repository**: https://github.com/rocicorp/ztunes
- **ZTunes README**: Architecture documentation and deployment guide
- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **drizzle-zero Docs**: https://github.com/rocicorp/drizzle-zero
- **Better Auth Docs**: https://www.better-auth.com/
- **TanStack Start Docs**: https://tanstack.com/start/latest
- **Zero Docs**: https://zero.rocicorp.dev/docs
- **Current ZERO-SYNC-PATTERNS.md**: Documents why REST APIs are wrong
