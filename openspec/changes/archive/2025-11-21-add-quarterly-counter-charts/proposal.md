# Add Quarterly Counter Charts Feature

> **STATUS: ✅ FULLY IMPLEMENTED** (October 18, 2024)
> 
> All features from this proposal have been implemented with one architectural improvement:
> - **Router:** React Router v7 (instead of TanStack Router) - simpler, smaller bundle, better Zero-sync integration
> - **Counter:** Fully functional with increment/decrement
> - **Charts:** All 10 chart types implemented and working
> - **API:** All endpoints implemented
> - **Database:** Tables created and seeded with 107 quarters of data

## Why

The project currently demonstrates Zero's real-time sync capabilities with a messaging application. Adding a counter feature with quarterly data visualization will showcase:
- Zero's ability to handle numeric data and real-time counter updates
- Integration with uPlot for high-performance charting
- Multiple visualization types for the same dataset
- Client-side routing with React Router
- API endpoints for counter mutations and data fetching

This feature mirrors the implementation from the reference repository (zero-solid-counter-uplot) but adapted for React instead of Solid.js, providing a comprehensive example of Zero + React + uPlot integration.

## What Changes

### Database Schema
- Add `value_quarters` table with columns:
  - `quarter` (text, primary key) - format: "YYYYQN" (e.g., "2024Q3")
  - `value` (double precision) - quarterly metric value
- Add `counters` table with columns:
  - `id` (text, primary key) - counter identifier
  - `value` (double precision) - current counter value
- Seed quarterly data from 1999Q1 to 2025Q4 with deterministic random values
- Seed main counter with initial value of 0

### Zero Schema
- Add `valueQuarter` table definition to `src/schema.ts`
- Add `counter` table definition to `src/schema.ts`
- Update schema export to include new tables
- Add TypeScript types for new entities

### API Endpoints (Hono)
- `GET /apithe former charts demo route` - Fetch current counter value
- `POST /apithe former charts demo route` - Increment or decrement counter (body: `{ op: "inc" | "dec" }`)
- `GET /api/quarters` - Fetch quarterly data as chart series (labels and values arrays)

### Frontend Components
- Add TanStack Router for client-side routing
- Create `the former charts demo route` route with file-based routing structure
- Create `former charts demo page` component with:
  - Increment/decrement buttons
  - Current counter value display
  - Loading and error states
  - Grid layout for 10 charts
- Create `QuarterChart` component:
  - React wrapper for uPlot instance
  - Lifecycle management (mount/unmount/update)
  - Responsive sizing
- Create chart factory module with 10 chart types:
  1. **Bars** - Column chart of raw quarterly values
  2. **Line** - Line chart showing quarter-to-quarter trend
  3. **Area** - Line with fill for magnitude emphasis
  4. **Scatter** - Points-only distribution view
  5. **Step** - Discrete step changes per quarter
  6. **Spline** - Smoothed interpolation curve
  7. **Cumulative** - Running total alongside raw values
  8. **Moving Average** - 4-quarter moving average overlay
  9. **Band** - Confidence band (±10%) around MA(4)
  10. **Dual Axis** - Raw values vs MA(8) with separate Y-axes

### Services Layer
- Create `src/servicesthe former charts demo route.ts` for counter API calls
- Create `src/services/quarters.ts` for quarterly data fetching
- Type-safe API response interfaces

### Styling & Assets
- Import uPlot CSS (`uplot/dist/uPlot.min.css`)
- Add responsive grid layout styles
- Add button and card styling for counter UI

### Navigation
- Add navigation link from home page to `the former charts demo route` route
- Add back link from counter page to home

## Impact

### Affected Specs
- **Database Schema** (new capability) - `value_quarters` and `counters` tables
- **Zero Schema** (extension) - Add quarterly and counter table definitions
- **API Routes** (new capability) - Counter and quarters endpoints
- **Client Routing** (new capability) - TanStack Router integration
- **Charting** (new capability) - uPlot integration with 10 chart variants

### Affected Code

#### New Files
- `openspec/changes/add-quarterly-counter-charts/proposal.md` (this file)
- `openspec/changes/add-quarterly-counter-charts/tasks.md` (implementation tasks)
- `openspec/changes/add-quarterly-counter-charts/specsthe former charts demo route-api/spec.md`
- `openspec/changes/add-quarterly-counter-charts/specs/quarterly-charts/spec.md`
- `docker/migrations/02_add_counter_quarters.sql` - Database migration
- `src/routes/__root.tsx` - Root route layout
- `src/routes/index.tsx` - Home route (existing App.tsx content)
- `src/routesthe former charts demo route.tsx` - Counter page route
- `the former charts demo component` - Counter page component
- `src/components/charts/QuarterChart.tsx` - Chart wrapper component
- `src/components/charts/factory.ts` - Chart factory with 10 types
- `src/servicesthe former charts demo route.ts` - Counter API service
- `src/services/quarters.ts` - Quarters API service
- `api/routesthe former charts demo route.ts` - Counter API handlers
- `api/routes/quarters.ts` - Quarters API handlers

#### Modified Files
- `package.json` - Add dependencies: `uplot`, `@tanstack/react-router`, `@tanstack/router-devtools`
- `src/schema.ts` - Add `valueQuarter` and `counter` tables
- `src/main.tsx` - Integrate TanStack Router
- `src/index.css` - Add chart and counter UI styles
- `api/index.ts` - Register new API routes
- `docker/seed.sql` - Add counter and quarters seed data (or separate migration)
- `openspec/project.md` - Update tech stack and domain context

### Breaking Changes
None - this is a purely additive feature. Existing messaging functionality remains unchanged.

### Benefits
- **Enhanced Demo Capabilities**: Showcases Zero with numeric data and real-time updates
- **Charting Integration**: Demonstrates high-performance visualization with uPlot
- **Routing Example**: Provides TanStack Router implementation pattern
- **Multiple Visualizations**: Shows how to present same data in 10 different chart types
- **API Patterns**: Examples of GET and POST endpoints with Hono
- **Reusable Components**: Chart factory pattern can be adapted for other data
- **Developer Learning**: Comprehensive example of full-stack feature implementation

### Dependencies
- `uplot` (^1.6.32) - High-performance charting library
- `@tanstack/react-router` (latest) - Type-safe routing for React
- `@tanstack/router-devtools` (latest) - Development tools for router debugging

### Migration Path
1. Run database migration to create new tables
2. Seed quarterly data (1999Q1-2025Q4) and initial counter
3. Install new npm dependencies
4. Add new API routes to Hono server
5. Integrate TanStack Router in React app
6. Add counter route and components
7. Test counter increment/decrement functionality
8. Verify all 10 chart types render correctly
9. Test navigation between routes

### Testing Considerations
- Counter increment/decrement operations
- API error handling (network failures, invalid operations)
- Chart rendering with various data sizes
- Responsive layout on different screen sizes
- Navigation between home and counter routes
- Real-time updates if counter is modified from multiple clients (future enhancement)

### Future Enhancements
- Real-time counter sync using Zero mutations instead of API calls
- Add counter to Zero schema for multi-client synchronization
- Quarterly data filtering (date range selection)
- Export chart data as CSV/JSON
- Additional chart customization options
- Multiple named counters instead of single "main" counter
