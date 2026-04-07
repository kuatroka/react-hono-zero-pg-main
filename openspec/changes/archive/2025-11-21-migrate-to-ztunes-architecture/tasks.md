# Implementation Tasks: Migrate to ZTunes Architecture

## 1. Phase 1: Foundation - Drizzle ORM Setup

### 1.1 Install Dependencies
- [ ] 1.1.1 Install `drizzle-orm` for PostgreSQL ORM
- [ ] 1.1.2 Install `drizzle-zero` for Zero schema generation
- [ ] 1.1.3 Install `@types/pg` for PostgreSQL types
- [ ] 1.1.4 Install `pg` for PostgreSQL client (if not already installed)
- [ ] 1.1.5 Update `package.json` with new dependencies

### 1.2 Create Drizzle Schema
- [ ] 1.2.1 Create `db/` directory
- [ ] 1.2.2 Create `db/schema.ts` with Drizzle table definitions
- [ ] 1.2.3 Define `entities` table (id, name, category, description, value, created_at)
- [ ] 1.2.4 Define `messages` table (id, body, labels, timestamp, sender_id, medium_id)
- [ ] 1.2.5 Define `users` table (id, name, is_partner)
- [ ] 1.2.6 Define `mediums` table (id, name)
- [ ] 1.2.7 Define `counters` table (id, value)
- [ ] 1.2.8 Define `value_quarters` table (quarter, value)
- [ ] 1.2.9 Export all table definitions

### 1.3 Configure Drizzle
- [ ] 1.3.1 Create `drizzle.config.ts` with PostgreSQL connection
- [ ] 1.3.2 Configure schema path (`db/schema.ts`)
- [ ] 1.3.3 Configure output directory for migrations (if using Drizzle migrations)
- [ ] 1.3.4 Test Drizzle configuration

### 1.4 Generate Zero Schema
- [ ] 1.4.1 Create `scripts/` directory
- [ ] 1.4.2 Create `scripts/generate-zero-schema.ts` using drizzle-zero
- [ ] 1.4.3 Configure output path (`zero/schema.gen.ts`)
- [ ] 1.4.4 Add npm script: `generate-zero-schema`
- [ ] 1.4.5 Run schema generation
- [ ] 1.4.6 Verify generated schema matches manual `src/schema.ts`
- [ ] 1.4.7 Add `.gitignore` entry for `zero/schema.gen.ts` (optional, or commit it)

### 1.5 Test Schema Compatibility
- [ ] 1.5.1 Import generated schema in test file
- [ ] 1.5.2 Verify TypeScript types are correct
- [ ] 1.5.3 Test with existing PostgreSQL data
- [ ] 1.5.4 Verify relationships work correctly
- [ ] 1.5.5 Document any schema differences

## 2. Phase 2: TanStack Start Migration

### 2.1 Install TanStack Dependencies
- [ ] 2.1.1 Install `@tanstack/start`
- [ ] 2.1.2 Install `@tanstack/react-router`
- [ ] 2.1.3 Install `@tanstack/router-devtools`
- [ ] 2.1.4 Install `vinxi` (TanStack Start server framework)
- [ ] 2.1.5 Remove `react-router` and `react-router-dom`
- [ ] 2.1.6 Update `package.json` scripts for TanStack Start

### 2.2 Create App Directory Structure
- [ ] 2.2.1 Create `app/` directory
- [ ] 2.2.2 Create `app/routes/` directory
- [ ] 2.2.3 Create `app/routes/api/` directory for API routes
- [ ] 2.2.4 Create `app/routes/api/zero/` directory
- [ ] 2.2.5 Create `app/routes/api/auth/` directory

### 2.3 Migrate Routing
- [ ] 2.3.1 Create `app/routes/__root.tsx` (root layout)
- [ ] 2.3.2 Create `app/routes/index.tsx` (home route)
- [ ] 2.3.3 Create `app/routesthe former charts demo route.tsx` (counter route)
- [ ] 2.3.4 Create `app/routes/entities.tsx` (entities list route)
- [ ] 2.3.5 Create `app/routes/entities.$id.tsx` (entity detail route)
- [ ] 2.3.6 Update `src/main.tsx` to use TanStack Router
- [ ] 2.3.7 Remove React Router code
- [ ] 2.3.8 Test all routes work correctly

### 2.4 Create API Routes
- [ ] 2.4.1 Create `app/routes/api/zero/get-queries.ts` (stub)
- [ ] 2.4.2 Create `app/routes/api/zero/mutate.ts` (stub)
- [ ] 2.4.3 Test API routes respond correctly
- [ ] 2.4.4 Keep Hono server running in parallel for now

### 2.5 Configure Vinxi
- [ ] 2.5.1 Create `app.config.ts` for TanStack Start configuration
- [ ] 2.5.2 Configure Bun as runtime
- [ ] 2.5.3 Configure port (3000)
- [ ] 2.5.4 Test dev server starts correctly

## 3. Phase 3: Better Auth Integration

### 3.1 Install Better Auth
- [ ] 3.1.1 Install `better-auth`
- [ ] 3.1.2 Install `@better-auth/react` (if available)
- [ ] 3.1.3 Remove `jose` (JWT library)

### 3.2 Create Auth Tables
- [ ] 3.2.1 Create migration: `docker/migrations/03_add_auth_tables.sql`
- [ ] 3.2.2 Add `sessions` table (id, user_id, expires_at, created_at)
- [ ] 3.2.3 Add `accounts` table (if needed for OAuth)
- [ ] 3.2.4 Run migration against PostgreSQL
- [ ] 3.2.5 Verify tables created correctly

### 3.3 Configure Better Auth
- [ ] 3.3.1 Create `lib/` directory
- [ ] 3.3.2 Create `lib/auth.ts` with Better Auth configuration
- [ ] 3.3.3 Configure PostgreSQL connection
- [ ] 3.3.4 Configure session settings (cookie name, max age)
- [ ] 3.3.5 Configure email/password provider
- [ ] 3.3.6 Test auth configuration

### 3.4 Create Auth API Route
- [ ] 3.4.1 Create `app/routes/api/auth/[...all].ts`
- [ ] 3.4.2 Import Better Auth handler
- [ ] 3.4.3 Handle GET and POST requests
- [ ] 3.4.4 Test auth endpoints respond correctly

### 3.5 Update Client Auth
- [ ] 3.5.1 Create auth context provider (if needed)
- [ ] 3.5.2 Update login component to use Better Auth
- [ ] 3.5.3 Update logout component to use Better Auth
- [ ] 3.5.4 Remove JWT token handling code
- [ ] 3.5.5 Test login/logout flow

### 3.6 Configure Zero Cache Cookie Forwarding
- [ ] 3.6.1 Update `.env` with `ZERO_GET_QUERIES_FORWARD_COOKIES=true`
- [ ] 3.6.2 Update `.env` with `ZERO_MUTATE_FORWARD_COOKIES=true`
- [ ] 3.6.3 Update `docker/docker-compose.yml` with cookie forwarding env vars
- [ ] 3.6.4 Restart Zero cache
- [ ] 3.6.5 Test cookies forwarded correctly

## 4. Phase 4: Custom Mutators

### 4.1 Create Mutators Module
- [ ] 4.1.1 Create `zero/` directory
- [ ] 4.1.2 Create `zero/mutators.ts`
- [ ] 4.1.3 Import Zod for validation
- [ ] 4.1.4 Import generated schema types
- [ ] 4.1.5 Create `createMutators` factory function

### 4.2 Implement Counter Mutators
- [ ] 4.2.1 Create `counter.increment` mutator
- [ ] 4.2.2 Add auth check (throw if no userId)
- [ ] 4.2.3 Add validation (counter exists)
- [ ] 4.2.4 Implement increment logic
- [ ] 4.2.5 Create `counter.decrement` mutator
- [ ] 4.2.6 Add auth check
- [ ] 4.2.7 Add validation
- [ ] 4.2.8 Implement decrement logic

### 4.3 Implement Message Mutators (Optional)
- [ ] 4.3.1 Create `message.create` mutator
- [ ] 4.3.2 Add Zod schema for message validation
- [ ] 4.3.3 Add auth check
- [ ] 4.3.4 Implement create logic
- [ ] 4.3.5 Create `message.update` mutator
- [ ] 4.3.6 Add permission check (user owns message)
- [ ] 4.3.7 Implement update logic
- [ ] 4.3.8 Create `message.delete` mutator
- [ ] 4.3.9 Add permission check
- [ ] 4.3.10 Implement delete logic

### 4.4 Integrate Mutators with API Route
- [ ] 4.4.1 Update `app/routes/api/zero/mutate.ts`
- [ ] 4.4.2 Import `createMutators`
- [ ] 4.4.3 Get user session from request
- [ ] 4.4.4 Create mutators with userId
- [ ] 4.4.5 Handle mutation requests
- [ ] 4.4.6 Add error handling
- [ ] 4.4.7 Test mutate endpoint

### 4.5 Update Client Components
- [ ] 4.5.1 Update `former charts demo component` to use custom mutators
- [ ] 4.5.2 Replace REST API calls with `z.mutate.counter.increment()`
- [ ] 4.5.3 Replace REST API calls with `z.mutate.counter.decrement()`
- [ ] 4.5.4 Add error handling
- [ ] 4.5.5 Test counter functionality

### 4.6 Remove Counter REST Endpoint
- [ ] 4.6.1 Delete `api/routesthe former charts demo route.ts`
- [ ] 4.6.2 Delete `src/servicesthe former charts demo route.ts`
- [ ] 4.6.3 Remove counter route from Hono server
- [ ] 4.6.4 Test counter still works

## 5. Phase 5: Synced Queries

### 5.1 Create Queries Module
- [ ] 5.1.1 Create `zero/queries.ts`
- [ ] 5.1.2 Import Zod for validation
- [ ] 5.1.3 Import `syncedQuery` from Zero
- [ ] 5.1.4 Import generated schema builder

### 5.2 Implement Search Query
- [ ] 5.2.1 Create `searchEntities` synced query
- [ ] 5.2.2 Add Zod schema: `z.tuple([z.string(), z.number()])`
- [ ] 5.2.3 Implement query builder (ILIKE, orderBy, limit)
- [ ] 5.2.4 Test query definition

### 5.3 Implement Quarterly Data Query
- [ ] 5.3.1 Create `getQuarterlyData` synced query
- [ ] 5.3.2 Add Zod schema: `z.tuple([])`
- [ ] 5.3.3 Implement query builder (orderBy quarter)
- [ ] 5.3.4 Test query definition

### 5.4 Implement Additional Queries
- [ ] 5.4.1 Create `getMessages` synced query (if needed)
- [ ] 5.4.2 Create `getEntities` synced query (if needed)
- [ ] 5.4.3 Add validation schemas
- [ ] 5.4.4 Test query definitions

### 5.5 Integrate Queries with API Route
- [ ] 5.5.1 Update `app/routes/api/zero/get-queries.ts`
- [ ] 5.5.2 Import queries from `zero/queries.ts`
- [ ] 5.5.3 Handle query requests
- [ ] 5.5.4 Add error handling
- [ ] 5.5.5 Test get-queries endpoint

### 5.6 Update Client Components
- [ ] 5.6.1 Update `GlobalSearch.tsx` to use `queries.searchEntities`
- [ ] 5.6.2 Update chart components to use `queries.getQuarterlyData`
- [ ] 5.6.3 Replace direct queries with synced queries
- [ ] 5.6.4 Add error handling
- [ ] 5.6.5 Test search functionality
- [ ] 5.6.6 Test charts render correctly

### 5.7 Remove Quarters REST Endpoint
- [ ] 5.7.1 Delete `api/routes/quarters.ts`
- [ ] 5.7.2 Delete `src/services/quarters.ts`
- [ ] 5.7.3 Remove quarters route from Hono server
- [ ] 5.7.4 Test charts still work

## 6. Phase 6: Zero Cache Reconfiguration

### 6.1 Update Environment Variables
- [ ] 6.1.1 Update `.env` with `ZERO_MUTATE_URL=http://localhost:3000/api/zero/mutate`
- [ ] 6.1.2 Update `.env` with `ZERO_GET_QUERIES_URL=http://localhost:3000/api/zero/get-queries`
- [ ] 6.1.3 Remove `ZERO_UPSTREAM_DB` (no direct PostgreSQL access)
- [ ] 6.1.4 Update `docker/docker-compose.yml` with new env vars
- [ ] 6.1.5 Verify cookie forwarding enabled

### 6.2 Test Zero Cache Configuration
- [ ] 6.2.1 Restart Zero cache with new configuration
- [ ] 6.2.2 Test mutations work through app endpoint
- [ ] 6.2.3 Test queries work through app endpoint
- [ ] 6.2.4 Verify auth context flows correctly
- [ ] 6.2.5 Check Zero cache logs for errors

### 6.3 Test Real-Time Sync
- [ ] 6.3.1 Open app in two browser tabs
- [ ] 6.3.2 Increment counter in tab 1
- [ ] 6.3.3 Verify counter updates in tab 2
- [ ] 6.3.4 Test with different users (if applicable)
- [ ] 6.3.5 Test with network throttling

### 6.4 Test Multi-Client Sync
- [ ] 6.4.1 Open app in different browsers
- [ ] 6.4.2 Test counter sync across browsers
- [ ] 6.4.3 Test search results sync
- [ ] 6.4.4 Test message CRUD sync
- [ ] 6.4.5 Verify no sync conflicts

## 7. Phase 7: Cleanup and Documentation

### 7.1 Remove Hono Server
- [ ] 7.1.1 Delete `api/` directory
- [ ] 7.1.2 Delete `api/index.ts`
- [ ] 7.1.3 Delete `api/routes/` directory
- [ ] 7.1.4 Remove Hono from `package.json`
- [ ] 7.1.5 Remove Hono dev script

### 7.2 Remove Old Services
- [ ] 7.2.1 Delete `src/servicesthe former charts demo route.ts`
- [ ] 7.2.2 Delete `src/services/quarters.ts`
- [ ] 7.2.3 Delete `src/services/` directory (if empty)

### 7.3 Remove Manual Schema
- [ ] 7.3.1 Delete `src/schema.ts`
- [ ] 7.3.2 Update imports to use `zero/schema.gen.ts`
- [ ] 7.3.3 Verify no references to old schema

### 7.4 Remove JWT Auth Code
- [ ] 7.4.1 Search for JWT-related code
- [ ] 7.4.2 Remove JWT token generation code
- [ ] 7.4.3 Remove JWT verification code
- [ ] 7.4.4 Remove `jose` from `package.json`
- [ ] 7.4.5 Verify no JWT references remain

### 7.5 Update Project Documentation
- [ ] 7.5.1 Update `openspec/project.md` with new tech stack
- [ ] 7.5.2 Update architecture patterns section
- [ ] 7.5.3 Update dependencies list
- [ ] 7.5.4 Update development setup instructions

### 7.6 Update README
- [ ] 7.6.1 Update tech stack section
- [ ] 7.6.2 Update installation instructions
- [ ] 7.6.3 Update development instructions
- [ ] 7.6.4 Add schema generation instructions
- [ ] 7.6.5 Update deployment instructions

### 7.7 Update Zero-Sync Patterns Documentation
- [ ] 7.7.1 Update `docs/ZERO-SYNC-PATTERNS.md`
- [ ] 7.7.2 Add custom mutators examples
- [ ] 7.7.3 Add synced queries examples
- [ ] 7.7.4 Add Better Auth integration examples
- [ ] 7.7.5 Update anti-patterns section

### 7.8 Create Migration Guide
- [ ] 7.8.1 Create `docs/MIGRATION-TO-ZTUNES-ARCHITECTURE.md`
- [ ] 7.8.2 Document breaking changes
- [ ] 7.8.3 Document migration steps
- [ ] 7.8.4 Add troubleshooting section
- [ ] 7.8.5 Add rollback instructions

## 8. Testing and Validation

### 8.1 Functional Testing
- [ ] 8.1.1 Test counter increment/decrement
- [ ] 8.1.2 Test all 10 chart types render
- [ ] 8.1.3 Test global search with various queries
- [ ] 8.1.4 Test entity list and detail pages
- [ ] 8.1.5 Test message CRUD operations
- [ ] 8.1.6 Test login/logout flow
- [ ] 8.1.7 Test session persistence

### 8.2 Security Testing
- [ ] 8.2.1 Verify client can't spoof user ID in mutations
- [ ] 8.2.2 Verify server-side validation prevents invalid mutations
- [ ] 8.2.3 Verify auth context enforced in all mutations
- [ ] 8.2.4 Test with unauthenticated requests
- [ ] 8.2.5 Test with invalid mutation parameters

### 8.3 Real-Time Sync Testing
- [ ] 8.3.1 Test counter sync across multiple tabs
- [ ] 8.3.2 Test search results sync
- [ ] 8.3.3 Test message sync
- [ ] 8.3.4 Test with network throttling
- [ ] 8.3.5 Test with offline/online transitions

### 8.4 Performance Testing
- [ ] 8.4.1 Benchmark counter mutations (before/after)
- [ ] 8.4.2 Benchmark search queries (before/after)
- [ ] 8.4.3 Benchmark chart rendering (before/after)
- [ ] 8.4.4 Test with large datasets
- [ ] 8.4.5 Monitor Zero cache performance

### 8.5 Error Handling Testing
- [ ] 8.5.1 Test with invalid mutation parameters
- [ ] 8.5.2 Test with invalid query parameters
- [ ] 8.5.3 Test with network errors
- [ ] 8.5.4 Test with database errors
- [ ] 8.5.5 Verify error messages are descriptive

### 8.6 Browser Compatibility Testing
- [ ] 8.6.1 Test in Chrome
- [ ] 8.6.2 Test in Firefox
- [ ] 8.6.3 Test in Safari
- [ ] 8.6.4 Test in Edge
- [ ] 8.6.5 Test on mobile browsers

## 9. Deployment Preparation

### 9.1 Update Deployment Configuration
- [ ] 9.1.1 Update SST configuration for TanStack Start
- [ ] 9.1.2 Update Vercel configuration (if applicable)
- [ ] 9.1.3 Update environment variables in deployment
- [ ] 9.1.4 Update build scripts
- [ ] 9.1.5 Test build process

### 9.2 Update Docker Configuration
- [ ] 9.2.1 Update `docker/docker-compose.yml` with new env vars
- [ ] 9.2.2 Update Zero cache configuration
- [ ] 9.2.3 Test Docker setup
- [ ] 9.2.4 Verify all services start correctly

### 9.3 Database Migration
- [ ] 9.3.1 Create production migration plan
- [ ] 9.3.2 Test migrations on staging
- [ ] 9.3.3 Create rollback plan
- [ ] 9.3.4 Document migration steps

### 9.4 Monitoring Setup
- [ ] 9.4.1 Add performance monitoring
- [ ] 9.4.2 Add error tracking
- [ ] 9.4.3 Add Zero cache monitoring
- [ ] 9.4.4 Set up alerts
- [ ] 9.4.5 Create monitoring dashboard

## 10. Final Validation

### 10.1 Code Review
- [ ] 10.1.1 Review all new code
- [ ] 10.1.2 Verify no old code remains
- [ ] 10.1.3 Check for TODO comments
- [ ] 10.1.4 Verify code style consistency
- [ ] 10.1.5 Run linter

### 10.2 Documentation Review
- [ ] 10.2.1 Review all updated documentation
- [ ] 10.2.2 Verify examples are correct
- [ ] 10.2.3 Check for broken links
- [ ] 10.2.4 Verify instructions are clear

### 10.3 OpenSpec Validation
- [ ] 10.3.1 Run `openspec validate migrate-to-ztunes-architecture --strict`
- [ ] 10.3.2 Fix any validation errors
- [ ] 10.3.3 Verify all specs are correct
- [ ] 10.3.4 Update proposal status

### 10.4 Final Testing
- [ ] 10.4.1 Run full test suite
- [ ] 10.4.2 Test all user flows
- [ ] 10.4.3 Test edge cases
- [ ] 10.4.4 Verify no regressions
- [ ] 10.4.5 Get stakeholder approval

### 10.5 Deployment
- [ ] 10.5.1 Deploy to staging
- [ ] 10.5.2 Test on staging
- [ ] 10.5.3 Deploy to production
- [ ] 10.5.4 Monitor for errors
- [ ] 10.5.5 Verify production works correctly

## Summary

**Total Tasks**: 250+
**Estimated Effort**: 2-3 weeks
**Risk Level**: High (complete architectural rewrite)
**Rollback Complexity**: High (one-way migration after Phase 7)

**Critical Path**:
1. Phase 1 (Foundation) → Phase 2 (TanStack Start) → Phase 3 (Better Auth)
2. Phase 4 (Mutators) → Phase 5 (Queries) → Phase 6 (Zero Cache)
3. Phase 7 (Cleanup) → Phase 8 (Testing) → Phase 9 (Deployment)

**Dependencies**:
- Phase 2 depends on Phase 1 (need generated schema)
- Phase 4 depends on Phase 3 (need auth context)
- Phase 5 depends on Phase 4 (similar patterns)
- Phase 6 depends on Phases 4 & 5 (need endpoints)
- Phase 7 depends on Phase 6 (need working system)
- Phase 9 depends on Phase 8 (need validated system)
