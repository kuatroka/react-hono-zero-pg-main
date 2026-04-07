# Implementation Tasks: Quarterly Counter Charts

## Phase 1: Database & Schema Setup

### Task 1.1: Create Database Migration
- [x] Create `docker/migrations/02_add_counter_quarters.sql`
- [x] Add `value_quarters` table definition
- [x] Add `counters` table definition
- [x] Add seed data for quarters (1999Q1-2025Q4)
- [x] Add seed data for main counter (initial value 0)
- [x] Test migration runs successfully

### Task 1.2: Update Zero Schema
- [x] Add `valueQuarter` table to `src/schema.ts`
- [x] Add `counter` table to `src/schema.ts`
- [x] Update `createSchema()` to include new tables
- [x] Export TypeScript types for new entities
- [x] Update permissions if needed (likely ANYONE_CAN for read-only quarters)
- [x] Test schema compiles without errors

## Phase 2: API Implementation

### Task 2.1: Counter API Endpoints
- [x] Create `api/routesthe former charts demo route.ts`
- [x] Implement `GET /apithe former charts demo route` handler
- [x] Implement `POST /apithe former charts demo route` handler (inc/dec)
- [x] Add input validation for operation type
- [x] Add error handling and appropriate status codes
- [x] Test endpoints with curl/Postman

### Task 2.2: Quarters API Endpoint
- [x] Create `api/routes/quarters.ts`
- [x] Implement `GET /api/quarters` handler
- [x] Query database and format as `{ labels: [], values: [] }`
- [x] Add error handling
- [x] Test endpoint returns correct data format

### Task 2.3: Register API Routes
- [x] Update `api/index.ts` to import new routes
- [x] Mount counter routes at `/apithe former charts demo route`
- [x] Mount quarters routes at `/api/quarters`
- [x] Test routes are accessible

## Phase 3: Client Services

### Task 3.1: Counter Service
- [x] Create `src/servicesthe former charts demo route.ts`
- [x] Implement `getValue()` function
- [x] Implement `increment()` function
- [x] Implement `decrement()` function
- [x] Add TypeScript types for responses
- [x] Add error handling

### Task 3.2: Quarters Service
- [x] Create `src/services/quarters.ts`
- [x] Implement `getChartSeries()` function
- [x] Define `ChartSeries` interface
- [x] Add error handling

## Phase 4: Routing Setup

### Task 4.1: Install TanStack Router
- [x] Add `@tanstack/react-router` to package.json
- [x] Add `@tanstack/router-devtools` to package.json
- [x] Run `bun install`

### Task 4.2: Configure Router
- [x] Create `src/routes/__root.tsx` (root layout)
- [x] Create `src/routes/index.tsx` (home route - move App.tsx content)
- [x] Create `src/routesthe former charts demo route.tsx` (counter route)
- [x] Update `src/main.tsx` to use TanStack Router
- [x] Add router provider and route tree
- [x] Test navigation between routes

### Task 4.3: Add Navigation Links
- [x] Add link to `the former charts demo route` in home page
- [x] Add back link in counter page
- [x] Style navigation links

## Phase 5: Chart Components

### Task 5.1: Install uPlot
- [x] Add `uplot` to package.json
- [x] Run `bun install`
- [x] Import uPlot CSS in `src/main.tsx` or `src/index.css`

### Task 5.2: Chart Factory
- [x] Create `src/components/charts/factory.ts`
- [x] Define `ChartKind` type
- [x] Define `ChartMeta` interface
- [x] Create `chartMetaList` array with 10 chart configs
- [x] Implement `makeBaseOptions()` helper
- [x] Implement `labelsToIndices()` helper
- [x] Implement `movingAverage()` helper
- [x] Implement `cumulative()` helper
- [x] Implement `baseAxes()` helper
- [x] Create factory functions for each chart type:
  - [x] `bars` factory
  - [x] `line` factory
  - [x] `area` factory
  - [x] `scatter` factory
  - [x] `step` factory
  - [x] `spline` factory
  - [x] `cumulative` factory
  - [x] `movingavg` factory
  - [x] `band` factory
  - [x] `dual` factory
- [x] Implement `createQuarterChart()` main factory
- [x] Implement `updateQuarterChart()` update function
- [x] Test each chart type renders correctly

### Task 5.3: QuarterChart Component
- [x] Create `src/components/charts/QuarterChart.tsx`
- [x] Define component props interface
- [x] Create container ref for uPlot
- [x] Implement useEffect for chart lifecycle
- [x] Create chart on mount
- [x] Update chart when props change
- [x] Destroy chart on unmount
- [x] Handle responsive sizing
- [x] Test component renders and updates correctly

## Phase 6: Counter Page

### Task 6.1: former charts demo page Component
- [x] Create `the former charts demo component`
- [x] Add state for counter value
- [x] Add state for loading
- [x] Add state for error
- [x] Add state for chart series data
- [x] Implement data fetching on mount
- [x] Implement increment handler
- [x] Implement decrement handler
- [x] Add optimistic updates
- [x] Add error handling and rollback
- [x] Render counter controls (buttons and value display)
- [x] Render primary chart (full width)
- [x] Render grid of 9 remaining charts
- [x] Add loading state UI
- [x] Add error state UI
- [x] Test all interactions work correctly

### Task 6.2: Styling
- [x] Add counter page styles to `src/index.css`
- [x] Style counter controls (buttons, value display)
- [x] Style charts grid layout
- [x] Style chart cards
- [x] Add responsive breakpoints
- [x] Test on different screen sizes

## Phase 7: Integration & Testing

### Task 7.1: Database Setup
- [x] Run database migration
- [x] Verify tables created
- [x] Verify seed data inserted
- [x] Check quarterly data (107 records)
- [x] Check counter initialized to 0

### Task 7.2: API Testing
- [x] Test GET /apithe former charts demo route returns initial value
- [x] Test POST /apithe former charts demo route with "inc" operation
- [x] Test POST /apithe former charts demo route with "dec" operation
- [x] Test invalid operation returns 400
- [x] Test GET /api/quarters returns correct format
- [x] Verify 107 quarters in response

### Task 7.3: UI Testing
- [x] Test navigation from home to counter page
- [x] Test navigation from counter back to home
- [x] Test counter increment button
- [x] Test counter decrement button
- [x] Test loading states display correctly
- [x] Test error states display correctly
- [x] Verify all 10 charts render
- [x] Test responsive layout on mobile
- [x] Test responsive layout on tablet
- [x] Test responsive layout on desktop

### Task 7.4: Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

## Phase 8: Documentation

### Task 8.1: Update Project Documentation
- [ ] Update `openspec/project.md` with new features
- [ ] Add uPlot to tech stack
- [ ] Add TanStack Router to tech stack
- [ ] Document counter and quarters tables
- [ ] Document new API endpoints
- [ ] Update domain context

### Task 8.2: Update README
- [ ] Add counter feature to README
- [ ] Document how to access counter page
- [ ] Add screenshots of charts (optional)
- [ ] Document new dependencies

### Task 8.3: Code Comments
- [ ] Add JSDoc comments to public APIs (if needed)
- [ ] Document complex chart calculations
- [ ] Add inline comments for non-obvious logic

## Phase 9: Polish & Optimization

### Task 9.1: Performance Optimization
- [ ] Memoize chart components where appropriate
- [ ] Optimize chart re-renders
- [ ] Test with React DevTools Profiler
- [ ] Ensure no memory leaks from uPlot instances

### Task 9.2: Accessibility
- [ ] Add ARIA labels to buttons
- [ ] Add ARIA labels to charts
- [ ] Test keyboard navigation
- [ ] Test with screen reader (optional)

### Task 9.3: Error Handling
- [ ] Add user-friendly error messages
- [ ] Add retry logic for failed API calls (optional)
- [ ] Add fallback UI for chart rendering errors

## Phase 10: Deployment Preparation

### Task 10.1: Environment Variables
- [ ] Verify no new environment variables needed
- [ ] Update .env.example if needed

### Task 10.2: Build Testing
- [ ] Run production build
- [ ] Test built application
- [ ] Verify all routes work in production build
- [ ] Verify charts render in production build

### Task 10.3: Git & PR
- [ ] Stage all changes
- [ ] Commit with descriptive message
- [ ] Push to feature branch
- [ ] Create pull request
- [ ] Add PR description with screenshots
- [ ] Request code review

## Estimated Timeline

- **Phase 1**: 2-3 hours (Database & Schema)
- **Phase 2**: 2-3 hours (API Implementation)
- **Phase 3**: 1 hour (Client Services)
- **Phase 4**: 2-3 hours (Routing Setup)
- **Phase 5**: 4-6 hours (Chart Components)
- **Phase 6**: 3-4 hours (Counter Page)
- **Phase 7**: 2-3 hours (Integration & Testing)
- **Phase 8**: 1-2 hours (Documentation)
- **Phase 9**: 1-2 hours (Polish & Optimization)
- **Phase 10**: 1 hour (Deployment Preparation)

**Total Estimated Time**: 19-29 hours

## Dependencies Between Phases

- Phase 2 depends on Phase 1 (database must exist)
- Phase 3 depends on Phase 2 (API must exist)
- Phase 5 depends on Phase 4 (routing must be set up)
- Phase 6 depends on Phases 3 and 5 (services and charts must exist)
- Phase 7 depends on all previous phases
- Phases 8-10 can be done in parallel after Phase 7

## Success Criteria

- [x] All 10 chart types render correctly with quarterly data
- [x] Counter increment/decrement works reliably
- [x] Navigation between routes is smooth
- [x] No console errors or warnings
- [x] Responsive layout works on all screen sizes
- [x] Code follows project conventions (no comments, TypeScript strict)
- [x] All tests pass
- [ ] Documentation is complete and accurate
