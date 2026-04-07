# Design: Migrate to ZTunes Architecture

## Context

The current application uses a hybrid architecture with Hono API server, manual Zero schema definitions, and mixed data access patterns (REST + Zero-sync). This violates Zero-sync best practices and creates security vulnerabilities.

ZTunes (https://github.com/rocicorp/ztunes) is Rocicorp's reference implementation demonstrating production-ready Zero-sync architecture. It uses:
- Drizzle ORM for schema management
- drizzle-zero for automatic Zero schema generation
- TanStack Start for full-stack React framework
- Better Auth for session-based authentication
- Custom mutators with server-side validation
- Synced queries with Zod validation

**Stakeholders:**
- Developers maintaining the application
- Users expecting secure, reliable data access
- Future contributors learning Zero-sync patterns

**Constraints:**
- Must maintain existing functionality (counter, charts, search, messages)
- Must keep Bun as runtime (no Node.js)
- Must preserve PostgreSQL data
- Must maintain real-time sync capabilities
- Must improve security (server-side validation)

## Goals / Non-Goals

### Goals

1. **Single Source of Truth**: Drizzle schema → auto-generated Zero schema
2. **Server-Side Validation**: All mutations validated before execution
3. **Auth-Aware Mutations**: User context enforced server-side
4. **Pure Zero-Sync**: All data access through Zero (no REST API duplication)
5. **Type Safety**: Full type safety from database to client
6. **Production Patterns**: Follow Rocicorp's reference implementation
7. **Keep Bun Runtime**: Use Bun everywhere Node.js was used

### Non-Goals

1. **Data Migration**: PostgreSQL schema stays the same (compatible)
2. **UI Redesign**: Keep existing UI components and styling
3. **New Features**: Focus on architecture migration only
4. **Performance Optimization**: Maintain current performance (optimize later)
5. **Deployment Changes**: Keep existing deployment targets (AWS, Vercel)

## Decisions

### Decision 1: Use Drizzle ORM as Single Source of Truth

**What**: Define database schema in `db/schema.ts` using Drizzle ORM, generate Zero schema automatically with drizzle-zero.

**Why**:
- Eliminates manual schema sync between PostgreSQL and Zero
- Provides type-safe database queries
- Industry-standard ORM with excellent TypeScript support
- drizzle-zero officially supported by Rocicorp

**Alternatives Considered**:
1. **Keep manual schema** - Rejected: Error-prone, maintenance burden
2. **Use Prisma** - Rejected: No official Zero integration, heavier runtime
3. **Use TypeORM** - Rejected: Decorator-based, not as type-safe

**Implementation**:
```typescript
// db/schema.ts
import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const entities = pgTable('entities', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  category: varchar('category').notNull(),
  description: varchar('description'),
  value: integer('value'),
  createdAt: timestamp('created_at').notNull(),
});

// Generate Zero schema
// npm run generate-zero-schema
// → zero/schema.gen.ts (auto-generated, never manually edited)
```

### Decision 2: Migrate from Hono to TanStack Start

**What**: Replace Hono API server with TanStack Start file-based API routes.

**Why**:
- TanStack Start is full-stack React framework (routing + API routes)
- File-based API routes co-located with frontend code
- Better integration with TanStack Router (required for synced queries)
- Supports Bun runtime
- ZTunes uses TanStack Start as reference

**Alternatives Considered**:
1. **Keep Hono** - Rejected: Doesn't integrate with TanStack Router, separate server process
2. **Use Next.js** - Rejected: Opinionated, heavier, not used in ZTunes reference
3. **Use Remix** - Rejected: Different patterns, not used in ZTunes reference

**Implementation**:
```typescript
// app/routes/api/zero/mutate.ts
import { createAPIFileRoute } from '@tanstack/start/api';
import { createMutators } from '~/zero/mutators';

export const Route = createAPIFileRoute('/api/zero/mutate')({
  POST: async ({ request }) => {
    const session = await getSession(request);
    const mutators = createMutators(session?.userId);
    // Handle mutation with server-side validation
  },
});
```

**Migration Strategy**:
1. Install TanStack Start and TanStack Router
2. Create API routes for Zero endpoints (`/api/zero/get-queries`, `/api/zero/mutate`)
3. Migrate React Router routes to TanStack Router
4. Remove Hono server after all endpoints migrated

### Decision 3: Replace JWT with Better Auth

**What**: Replace JWT-based authentication with Better Auth session-based authentication.

**Why**:
- Session-based auth more secure (can't be stolen from localStorage)
- Cookie forwarding works seamlessly with Zero cache
- Better Auth provides built-in session management
- ZTunes uses Better Auth as reference
- Easier to integrate with TanStack Start

**Alternatives Considered**:
1. **Keep JWT** - Rejected: Requires manual cookie management, less secure
2. **Use NextAuth** - Rejected: Tied to Next.js, not framework-agnostic
3. **Use Clerk** - Rejected: Third-party service, adds dependency

**Implementation**:
```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: {
    provider: 'postgres',
    url: process.env.DATABASE_URL,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});

// app/routes/api/auth/[...all].ts
import { createAPIFileRoute } from '@tanstack/start/api';
import { auth } from '~/lib/auth';

export const Route = createAPIFileRoute('/api/auth/$')({
  GET: async ({ request }) => auth.handler(request),
  POST: async ({ request }) => auth.handler(request),
});
```

**Migration Strategy**:
1. Install Better Auth
2. Create auth tables in PostgreSQL
3. Implement auth API routes
4. Update login/logout components
5. Configure cookie forwarding in Zero cache
6. Remove JWT code after testing

### Decision 4: Implement Custom Mutators with Server-Side Validation

**What**: Create `zero/mutators.ts` with custom mutators that validate mutations server-side before execution.

**Why**:
- Prevents client from spoofing user IDs or bypassing business logic
- Centralizes business logic in one place
- Enables permission enforcement
- Allows server-side computed fields
- ZTunes pattern for production apps

**Alternatives Considered**:
1. **Keep direct client mutations** - Rejected: Security vulnerability, no validation
2. **Use database triggers** - Rejected: Logic split between app and database
3. **Use API endpoints** - Rejected: Bypasses Zero-sync, defeats local-first

**Implementation**:
```typescript
// zero/mutators.ts
import { z } from 'zod';
import type { Transaction } from '@rocicorp/zero';
import type { Schema } from './schema.gen';

const counterOpSchema = z.enum(['inc', 'dec']);

export function createMutators(userId: string | undefined) {
  return {
    counter: {
      increment: async (tx: Transaction<Schema>) => {
        if (!userId) {
          throw new Error('Not authenticated');
        }
        
        const counter = await tx.query.counter.where('id', '=', 'main').one();
        if (!counter) {
          throw new Error('Counter not found');
        }
        
        await tx.mutate.counter.update({
          id: 'main',
          value: counter.value + 1,
        });
      },
      
      decrement: async (tx: Transaction<Schema>) => {
        if (!userId) {
          throw new Error('Not authenticated');
        }
        
        const counter = await tx.query.counter.where('id', '=', 'main').one();
        if (!counter) {
          throw new Error('Counter not found');
        }
        
        await tx.mutate.counter.update({
          id: 'main',
          value: counter.value - 1,
        });
      },
    },
  };
}
```

**Client Usage**:
```typescript
// Before (insecure)
z.mutate.counter.update({ id: 'main', value: counter.value + 1 });

// After (secure)
await z.mutate.counter.increment();
```

### Decision 5: Implement Synced Queries with Zod Validation

**What**: Create `zero/queries.ts` with synced query definitions that validate parameters with Zod.

**Why**:
- Type-safe query parameters
- Reusable query definitions
- Server-side validation of query parameters
- Better error messages for invalid queries
- ZTunes pattern for production apps

**Alternatives Considered**:
1. **Keep direct queries** - Rejected: No validation, duplicated query logic
2. **Use GraphQL** - Rejected: Adds complexity, not Zero-sync pattern
3. **Use tRPC** - Rejected: Different paradigm, not Zero-sync pattern

**Implementation**:
```typescript
// zero/queries.ts
import { z } from 'zod';
import { syncedQuery } from '@rocicorp/zero';
import { builder } from './schema.gen';

export const queries = {
  searchEntities: syncedQuery(
    'searchEntities',
    z.tuple([z.string(), z.number()]),
    (query: string, limit: number) =>
      builder.entities
        .where('name', 'ILIKE', `%${query}%`)
        .orderBy('created_at', 'desc')
        .limit(limit),
  ),
  
  getQuarterlyData: syncedQuery(
    'getQuarterlyData',
    z.tuple([]),
    () =>
      builder.valueQuarter
        .orderBy('quarter', 'asc'),
  ),
};
```

**Client Usage**:
```typescript
// Before
const [results] = useQuery(
  z.query.entities
    .where('name', 'ILIKE', `%${query}%`)
    .limit(5)
);

// After (validated)
const [results] = useQuery(queries.searchEntities(query, 5));
```

### Decision 6: Reconfigure Zero Cache to Call App Endpoints

**What**: Change Zero cache from direct PostgreSQL access to calling app API endpoints.

**Why**:
- Enables auth context in mutations (cookie forwarding)
- Allows server-side validation before database writes
- Centralizes business logic in app (not Zero cache)
- ZTunes pattern for production apps

**Alternatives Considered**:
1. **Keep direct DB access** - Rejected: No auth context, no validation
2. **Use Zero cache plugins** - Rejected: More complex, less flexible

**Implementation**:
```bash
# .env (before)
ZERO_UPSTREAM_DB="postgresql://user:password@127.0.0.1:5432/postgres"

# .env (after)
ZERO_MUTATE_URL="http://localhost:3000/api/zero/mutate"
ZERO_GET_QUERIES_URL="http://localhost:3000/api/zero/get-queries"
ZERO_GET_QUERIES_FORWARD_COOKIES="true"
ZERO_MUTATE_FORWARD_COOKIES="true"
```

### Decision 7: Keep Bun as Runtime

**What**: Use Bun for all server-side code (TanStack Start, scripts, tools).

**Why**:
- Already migrated from Node.js to Bun
- Faster than Node.js
- Built-in TypeScript support
- Compatible with TanStack Start
- Simpler tooling (no separate bundler needed)

**Alternatives Considered**:
1. **Switch back to Node.js** - Rejected: Slower, already migrated
2. **Use Deno** - Rejected: Less ecosystem support, not tested with TanStack Start

**Implementation**:
```json
// package.json
{
  "scripts": {
    "dev": "bun run --bun vinxi dev",
    "build": "bun run --bun vinxi build",
    "start": "bun run --bun vinxi start",
    "generate-zero-schema": "bun run scripts/generate-zero-schema.ts"
  }
}
```

## Risks / Trade-offs

### Risk 1: Increased Complexity

**Risk**: More abstraction layers (Drizzle → drizzle-zero → Zero → Client)

**Mitigation**:
- Follow ZTunes reference implementation exactly
- Document each layer's purpose
- Create migration guide for developers
- Add inline examples in code

**Trade-off**: Complexity vs. Correctness - Accept higher complexity for correct architecture

### Risk 2: Learning Curve

**Risk**: Team needs to learn Drizzle, TanStack Start, Better Auth, custom mutators

**Mitigation**:
- Provide training sessions
- Create comprehensive documentation
- Reference ZTunes for examples
- Pair programming during migration

**Trade-off**: Short-term productivity loss vs. Long-term maintainability

### Risk 3: Migration Bugs

**Risk**: Breaking existing functionality during migration

**Mitigation**:
- Migrate in phases (one component at a time)
- Comprehensive testing after each phase
- Keep old code until new code tested
- Feature flags for gradual rollout

**Trade-off**: Migration time vs. Risk of bugs

### Risk 4: Zero Cache Configuration

**Risk**: Cookie forwarding and endpoint configuration may not work correctly

**Mitigation**:
- Test auth flow thoroughly
- Verify cookies forwarded correctly
- Test with multiple clients
- Monitor Zero cache logs

**Trade-off**: Configuration complexity vs. Auth security

### Risk 5: Performance Impact

**Risk**: Additional validation and endpoint calls may slow down mutations

**Mitigation**:
- Benchmark before and after migration
- Optimize validation logic
- Use Zod's efficient validation
- Cache validation results where possible

**Trade-off**: Validation overhead vs. Security

## Migration Plan

### Phase 1: Foundation (Week 1)

**Goal**: Set up Drizzle ORM and generate Zero schema

**Steps**:
1. Install dependencies: `drizzle-orm`, `drizzle-zero`, `@types/pg`
2. Create `db/schema.ts` with all existing tables
3. Create `drizzle.config.ts` for Drizzle configuration
4. Create `scripts/generate-zero-schema.ts` for schema generation
5. Run schema generation: `bun run generate-zero-schema`
6. Verify generated `zero/schema.gen.ts` matches manual `src/schema.ts`
7. Test with existing PostgreSQL data

**Success Criteria**:
- Generated schema matches manual schema
- No TypeScript errors
- Existing data accessible through generated schema

**Rollback**: Delete generated files, keep manual schema

### Phase 2: TanStack Start Migration (Week 1-2)

**Goal**: Replace Hono with TanStack Start

**Steps**:
1. Install dependencies: `@tanstack/start`, `@tanstack/react-router`, `vinxi`
2. Create `app/` directory structure
3. Migrate React Router routes to TanStack Router
4. Create API routes: `/api/zero/get-queries`, `/api/zero/mutate`
5. Test routing works correctly
6. Keep Hono server running in parallel during testing

**Success Criteria**:
- All routes accessible
- API routes respond correctly
- No routing errors

**Rollback**: Keep Hono server, remove TanStack Start

### Phase 3: Better Auth Integration (Week 2)

**Goal**: Replace JWT with Better Auth

**Steps**:
1. Install dependencies: `better-auth`
2. Create auth tables in PostgreSQL
3. Create `lib/auth.ts` with Better Auth configuration
4. Create API route: `/api/auth/[...all]`
5. Update login/logout components
6. Test auth flow (login, logout, session)
7. Configure cookie forwarding in Zero cache

**Success Criteria**:
- Login/logout works
- Sessions persist correctly
- Cookies forwarded to Zero cache

**Rollback**: Keep JWT auth, remove Better Auth

### Phase 4: Custom Mutators (Week 2)

**Goal**: Implement server-side validated mutations

**Steps**:
1. Create `zero/mutators.ts` with counter mutators
2. Add Zod validation schemas
3. Implement `increment` and `decrement` mutators
4. Update `/api/zero/mutate` to use custom mutators
5. Update client components to use custom mutators
6. Remove REST API endpoints: `/apithe former charts demo route`
7. Test counter functionality

**Success Criteria**:
- Counter increment/decrement works
- Server-side validation prevents invalid mutations
- Auth context enforced

**Rollback**: Keep REST endpoints, remove custom mutators

### Phase 5: Synced Queries (Week 2-3)

**Goal**: Implement validated synced queries

**Steps**:
1. Create `zero/queries.ts` with query definitions
2. Add Zod validation for query parameters
3. Implement `searchEntities` and `getQuarterlyData` queries
4. Update `/api/zero/get-queries` to use synced queries
5. Update client components to use synced queries
6. Remove REST API endpoints: `/api/quarters`
7. Test search and charts functionality

**Success Criteria**:
- Search works with validated queries
- Charts render with synced query data
- Query validation prevents invalid parameters

**Rollback**: Keep REST endpoints, remove synced queries

### Phase 6: Zero Cache Reconfiguration (Week 3)

**Goal**: Configure Zero cache to call app endpoints

**Steps**:
1. Update `.env` with Zero endpoint URLs
2. Enable cookie forwarding
3. Remove direct PostgreSQL connection from Zero cache
4. Test real-time sync with multiple clients
5. Verify auth context flows through correctly
6. Monitor Zero cache logs for errors

**Success Criteria**:
- Real-time sync works
- Auth context enforced in mutations
- No Zero cache errors

**Rollback**: Restore direct PostgreSQL connection

### Phase 7: Cleanup (Week 3)

**Goal**: Remove old code and update documentation

**Steps**:
1. Delete `api/` directory (Hono server)
2. Delete `src/servicesthe former charts demo route.ts` and `src/services/quarters.ts`
3. Delete `src/schema.ts` (manual schema)
4. Remove JWT auth code
5. Update `openspec/project.md`
6. Update `README.md`
7. Update `docs/ZERO-SYNC-PATTERNS.md`
8. Final testing

**Success Criteria**:
- No old code remains
- Documentation updated
- All tests pass

**Rollback**: N/A (point of no return)

## Open Questions

1. **Drizzle Migrations**: Should we use Drizzle migrations or keep SQL migrations?
   - **Recommendation**: Keep SQL migrations for now, migrate to Drizzle migrations later

2. **Better Auth Providers**: Which auth providers should we support (email, OAuth)?
   - **Recommendation**: Start with email/password, add OAuth later

3. **Synced Queries Caching**: Should we implement query result caching?
   - **Recommendation**: No, Zero handles caching automatically

4. **Custom Mutators Batching**: Should we support batched mutations?
   - **Recommendation**: No, implement later if needed

5. **Error Handling**: How should we handle validation errors in mutators?
   - **Recommendation**: Throw errors with descriptive messages, catch in client

6. **Testing Strategy**: Should we add automated tests during migration?
   - **Recommendation**: Yes, add tests for custom mutators and synced queries

7. **Deployment**: Do we need to update deployment configuration?
   - **Recommendation**: Yes, update to deploy TanStack Start instead of Hono

8. **Performance Monitoring**: Should we add performance monitoring?
   - **Recommendation**: Yes, add basic monitoring to compare before/after

## Success Metrics

**Technical Metrics**:
- Zero REST API endpoints (currently 2: `/apithe former charts demo route`, `/api/quarters`)
- 100% server-side validation coverage for mutations
- 100% auth context enforcement in mutations
- Zero manual schema sync issues
- Full type safety from database to client

**Quality Metrics**:
- All existing functionality works
- No security vulnerabilities (client can't spoof user ID)
- Real-time sync works across multiple clients
- No performance degradation (same or better)

**Developer Experience Metrics**:
- Schema changes require only one file edit (`db/schema.ts`)
- New mutations added in one place (`zero/mutators.ts`)
- New queries added in one place (`zero/queries.ts`)
- Clear error messages for validation failures
- Comprehensive documentation and examples

## References

- **ZTunes Repository**: https://github.com/rocicorp/ztunes
- **ZTunes README**: Architecture documentation
- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **drizzle-zero GitHub**: https://github.com/rocicorp/drizzle-zero
- **Better Auth Docs**: https://www.better-auth.com/
- **TanStack Start Docs**: https://tanstack.com/start/latest
- **TanStack Router Docs**: https://tanstack.com/router/latest
- **Zero Docs**: https://zero.rocicorp.dev/docs
- **Zod Docs**: https://zod.dev/
