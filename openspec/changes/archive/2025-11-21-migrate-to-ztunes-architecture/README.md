# Migrate to ZTunes Architecture

> **STATUS**: 📋 Proposal - Awaiting Approval
>
> **RISK LEVEL**: 🔴 High - Complete architectural rewrite
>
> **ESTIMATED EFFORT**: 2-3 weeks

## Quick Summary

This proposal migrates the application from a hybrid Hono + manual Zero schema architecture to the ZTunes reference architecture with:
- **Drizzle ORM** for schema management (single source of truth)
- **TanStack Start** for full-stack React framework
- **Better Auth** for session-based authentication
- **Custom Mutators** with server-side validation
- **Synced Queries** with Zod validation
- **Bun** as runtime (no Node.js)

## Why This Change?

The current architecture violates Zero-sync best practices:
1. ❌ Mixed data access (REST API + Zero-sync)
2. ❌ Manual schema sync between PostgreSQL and Zero
3. ❌ No server-side validation
4. ❌ Client can spoof user IDs
5. ❌ REST endpoints bypass Zero's benefits

ZTunes (https://github.com/rocicorp/ztunes) is Rocicorp's reference implementation showing the correct way to build production Zero-sync apps.

## What Changes?

### Core Stack Migration

| Component | Before | After |
|-----------|--------|-------|
| **API Server** | Hono | TanStack Start |
| **Router** | React Router | TanStack Router |
| **Auth** | JWT (jose) | Better Auth (sessions) |
| **Schema** | Manual (`src/schema.ts`) | Auto-generated (`zero/schema.gen.ts`) |
| **Schema Source** | Manual definition | Drizzle ORM (`db/schema.ts`) |
| **Data Access** | Mixed (REST + Zero) | Pure Zero-sync |
| **Mutations** | Direct client | Server-validated custom mutators |
| **Queries** | Direct Zero queries | Synced queries with validation |
| **Runtime** | Bun | Bun (no change) |

### Files Deleted

```
api/                          # Entire Hono server
src/servicesthe former charts demo route.ts       # REST API client
src/services/quarters.ts      # REST API client
src/schema.ts                 # Manual schema
```

### Files Created

```
db/schema.ts                           # Drizzle ORM schema (source of truth)
zero/schema.gen.ts                     # Auto-generated Zero schema
zero/mutators.ts                       # Custom mutators with validation
zero/queries.ts                        # Synced queries with validation
app/routes/api/zero/get-queries.ts     # TanStack Start API route
app/routes/api/zero/mutate.ts          # TanStack Start API route
app/routes/api/auth/[...all].ts        # Better Auth API route
lib/auth.ts                            # Better Auth configuration
drizzle.config.ts                      # Drizzle configuration
scripts/generate-zero-schema.ts        # Schema generation script
```

## Benefits

✅ **Security**: Server-side validation prevents client spoofing
✅ **Maintainability**: Auto-generated schemas eliminate sync issues
✅ **Best Practices**: Follows Rocicorp's reference implementation
✅ **Type Safety**: Full type safety from database to client
✅ **Scalability**: Production-ready patterns
✅ **Developer Experience**: Single source of truth for schema

## Migration Phases

### Phase 1: Foundation (Week 1)
- Install Drizzle ORM and drizzle-zero
- Define schema in `db/schema.ts`
- Generate Zero schema
- Install TanStack Start

### Phase 2: Auth & API Routes (Week 1-2)
- Install Better Auth
- Create TanStack Start API routes
- Migrate JWT to sessions

### Phase 3: Mutators & Queries (Week 2)
- Implement custom mutators
- Implement synced queries
- Remove REST endpoints

### Phase 4: Client Migration (Week 2-3)
- Update components to use mutators/queries
- Remove REST API clients

### Phase 5: Zero Cache Reconfiguration (Week 3)
- Configure Zero to call app endpoints
- Enable cookie forwarding

### Phase 6: Cleanup (Week 3)
- Remove Hono server
- Remove JWT auth
- Update documentation

## Breaking Changes

⚠️ **This is a complete architectural rewrite with breaking changes:**

1. API Server: Different route structure
2. Router: Different routing API
3. Auth: Different auth flow (sessions vs JWT)
4. Schema: Different schema location
5. Data Access: No REST endpoints
6. Mutations: Must use custom mutators
7. Queries: Must use synced queries

## Testing Requirements

**Critical Tests:**
- ✅ Server-side validation prevents invalid mutations
- ✅ Auth context enforced (can't spoof user ID)
- ✅ Schema generation produces correct Zero schema
- ✅ All existing functionality works
- ✅ Real-time sync works across multiple clients
- ✅ Cookie forwarding works with Zero cache

**Regression Tests:**
- ✅ Counter increment/decrement
- ✅ Quarterly charts render
- ✅ Global search works
- ✅ Messages CRUD operations
- ✅ Multi-tab sync

## Rollback Plan

If migration fails:
1. Revert to previous commit
2. Keep PostgreSQL data (schema compatible)
3. Restore Hono API server
4. Restore JWT auth
5. Restore manual schema

**Note**: This is a one-way migration. Rolling back after deployment requires significant effort.

## Files in This Change

- **proposal.md** - Detailed proposal (why, what, impact)
- **design.md** - Technical decisions and architecture
- **tasks.md** - Implementation checklist (250+ tasks)
- **specs/** - Spec deltas for 5 new capabilities:
  - `drizzle-schema-management/spec.md`
  - `zero-custom-mutators/spec.md`
  - `zero-synced-queries/spec.md`
  - `better-auth-integration/spec.md`
  - `tanstack-start-api-routes/spec.md`

## References

- **ZTunes Repository**: https://github.com/rocicorp/ztunes
- **Drizzle ORM**: https://orm.drizzle.team/
- **drizzle-zero**: https://github.com/rocicorp/drizzle-zero
- **Better Auth**: https://www.better-auth.com/
- **TanStack Start**: https://tanstack.com/start/latest
- **Zero Docs**: https://zero.rocicorp.dev/docs

## Next Steps

1. **Review** this proposal and all spec deltas
2. **Discuss** technical decisions in design.md
3. **Approve** or request changes
4. **Begin** Phase 1 implementation after approval

## Validation

```bash
# Validate this change
openspec validate migrate-to-ztunes-architecture --strict

# View proposal
openspec show migrate-to-ztunes-architecture

# View spec deltas
openspec diff migrate-to-ztunes-architecture
```

---

**Created**: 2025-01-17
**Author**: AI Assistant (Friday)
**Change ID**: `migrate-to-ztunes-architecture`
