## 1. Phase 1: Schema Automation (drizzle-zero)

- [ ] 1.1 Install drizzle-zero as dev dependency
- [ ] 1.2 Add `generate-zero-schema` script to package.json
- [ ] 1.3 Run drizzle-zero to generate `src/zero/schema.gen.ts`
- [ ] 1.4 Create `src/zero/schema.ts` that imports and re-exports from schema.gen.ts
- [ ] 1.5 Update `src/schema.ts` to import schema from `src/zero/schema.ts`
- [ ] 1.6 Verify all existing Zero queries still work
- [ ] 1.7 Remove manual table definitions from `src/schema.ts`
- [ ] 1.8 Update AGENTS.md with new schema generation workflow

## 2. Phase 2: TanStack Router Migration

- [ ] 2.1 Install @tanstack/react-router and @tanstack/react-start
- [ ] 2.2 Install @tanstack/router-plugin for Vite
- [ ] 2.3 Update vite.config.ts with TanStack Start plugin (SPA mode)
- [ ] 2.4 Create `app/router.tsx` with router configuration and Zero context
- [ ] 2.5 Create `app/routes/__root.tsx` with RootDocument component
- [ ] 2.6 Create `app/components/ZeroInit.tsx` wrapper component
- [ ] 2.7 Create `app/routes/_layout.tsx` with GlobalNav and layout
- [ ] 2.8 Migrate landing page: `app/routes/_layout/index.tsx`
- [ ] 2.9 Migrate assets table: `app/routes/_layout/assets.tsx` with loader
- [ ] 2.10 Migrate asset detail: `app/routes/_layout/assets.$code.$cusip.tsx` with loader
- [ ] 2.11 Migrate superinvestors table: `app/routes/_layout/superinvestors.tsx` with loader
- [ ] 2.12 Migrate superinvestor detail: `app/routes/_layout/superinvestors.$cik.tsx` with loader
- [ ] 2.13 Migrate messages page: `app/routes/_layout/messages.tsx`
- [ ] 2.14 Migrate counter page: `app/routes/_layoutthe former charts demo route.tsx`
- [ ] 2.15 Migrate profile page: `app/routes/_layout/profile.tsx`
- [ ] 2.16 Configure `defaultPreload: 'viewport'` in router
- [ ] 2.17 Update preload strategy to use route loaders
- [ ] 2.18 Remove react-router-dom dependency
- [ ] 2.19 Delete old `src/main.tsx` routing code
- [ ] 2.20 Update GlobalNav to use TanStack Link components

## 3. Phase 3: Better Auth Integration

- [ ] 3.1 Install better-auth package
- [ ] 3.2 Create `auth/schema.ts` with Better Auth tables (user, session, account)
- [ ] 3.3 Add Better Auth tables to Drizzle schema
- [ ] 3.4 Run migrations for auth tables
- [ ] 3.5 Create `auth/auth.ts` with Better Auth configuration
- [ ] 3.6 Create `auth/client.ts` for client-side auth utilities
- [ ] 3.7 Create `app/routes/api/auth/[...all].ts` catch-all route
- [ ] 3.8 Update ZeroInit to use Better Auth session
- [ ] 3.9 Scaffold `zero/mutators.ts` with `createMutators(userId)` (empty for now)
- [ ] 3.10 Create login page: `app/routes/login.tsx`
- [ ] 3.11 Create registration page: `app/routes/register.tsx`
- [ ] 3.12 Add login/logout buttons to GlobalNav
- [ ] 3.13 Configure cookie forwarding for Zero endpoints
- [ ] 3.14 Remove JWT generation code from api/index.ts
- [ ] 3.15 Remove jose dependency
- [ ] 3.16 Update environment variables documentation

## 4. Cleanup and Documentation

- [ ] 4.1 Update project.md with new architecture
- [ ] 4.2 Update README.md with new setup instructions
- [ ] 4.3 Archive old Hono API routes (keep for reference)
- [ ] 4.4 Update dev scripts in package.json
- [ ] 4.5 Test all routes with viewport preloading
- [ ] 4.6 Test authentication flow
- [ ] 4.7 Performance test: measure LCP improvement
