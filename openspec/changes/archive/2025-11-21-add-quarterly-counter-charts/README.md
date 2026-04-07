# Quarterly Counter Charts - Change Proposal

> **⚠️ STATUS: PARTIALLY IMPLEMENTED & SUPERSEDED**  
> This proposal was partially implemented. The counter and charts features exist, but the routing evolved to use React Router instead of TanStack Router.  
> **See:** [mvp-full-implementation](../mvp-full-implementation/) for the actual implementation.

## Quick Reference

This change proposal adds a counter feature with quarterly data visualization using uPlot charts, demonstrating Zero + React + TanStack Router integration.

## Documents

1. **[proposal.md](./proposal.md)** - High-level change proposal
   - Why this feature is needed
   - What changes will be made
   - Impact analysis and benefits

2. **[tasks.md](./tasks.md)** - Detailed implementation checklist
   - 10 phases with specific tasks
   - Estimated timeline (19-29 hours)
   - Success criteria

3. **[specsthe former charts demo route-api/spec.md](./specsthe former charts demo route-api/spec.md)** - Counter API specification
   - Database schema for counters table
   - GET /apithe former charts demo route endpoint
   - POST /apithe former charts demo route endpoint (inc/dec operations)
   - Implementation details and testing

4. **[specs/quarterly-charts/spec.md](./specs/quarterly-charts/spec.md)** - Charts specification
   - Database schema for value_quarters table
   - GET /api/quarters endpoint
   - 10 chart type specifications
   - uPlot configuration and component architecture

## Key Features

### Counter
- Simple increment/decrement counter
- Persisted in PostgreSQL
- RESTful API (GET/POST)
- Optimistic UI updates

### Charts (10 Types)
1. **Bars** - Column chart of raw values
2. **Line** - Trend line with points
3. **Area** - Filled area chart
4. **Scatter** - Points-only distribution
5. **Step** - Discrete step changes
6. **Spline** - Smooth interpolation
7. **Cumulative** - Running total overlay
8. **Moving Average** - 4-quarter MA
9. **Band** - Confidence band (±10% MA)
10. **Dual Axis** - Two independent Y-axes

### Data
- 107 quarters (1999Q1 to 2025Q4)
- Deterministic random values (seed 0.42)
- Values range: 1 to 500 billion

## Tech Stack Additions

- **uPlot** (^1.6.32) - High-performance charting
- **TanStack Router** (latest) - Type-safe routing
- **PostgreSQL** - Two new tables (counters, value_quarters)

## File Structure

```
openspec/changes/add-quarterly-counter-charts/
├── README.md (this file)
├── proposal.md
├── tasks.md
└── specs/
    ├── counter-api/
    │   └── spec.md
    └── quarterly-charts/
        └── spec.md
```

## Implementation Overview

### Phase 1: Database
- Create migration with counters and value_quarters tables
- Seed quarterly data and initial counter

### Phase 2: API
- Implement counter endpoints (GET/POST)
- Implement quarters endpoint (GET)

### Phase 3: Services
- Create client-side API wrappers
- Type-safe request/response handling

### Phase 4: Routing
- Install and configure TanStack Router
- Create route structure (/, the former charts demo route)

### Phase 5: Charts
- Install uPlot
- Create chart factory with 10 types
- Create QuarterChart React component

### Phase 6: UI
- Create former charts demo page component
- Implement counter controls
- Render 10 charts in responsive grid

### Phase 7-10: Testing, Documentation, Polish

## Quick Start (After Implementation)

1. **Start database**: `bun run dev:db-up`
2. **Run migration**: Apply 02_add_counter_quarters.sql
3. **Start dev servers**: `bun run dev`
4. **Navigate to counter**: http://localhost:3003the former charts demo route

## API Endpoints

```bash
# Get counter value
GET /apithe former charts demo route
Response: { "value": 0 }

# Increment counter
POST /apithe former charts demo route
Body: { "op": "inc" }
Response: { "value": 1 }

# Decrement counter
POST /apithe former charts demo route
Body: { "op": "dec" }
Response: { "value": 0 }

# Get quarterly data
GET /api/quarters
Response: { 
  "labels": ["1999Q1", "1999Q2", ...], 
  "values": [123456789.12, ...] 
}
```

## Reference Implementation

This feature is based on:
- **Solid.js version**: `/Users/yo_macbook/Documents/dev/zero-solid-counter-uplot`
- **Routing pattern**: rocicorp/ztunes (TanStack Router usage)

## Success Metrics

- ✅ All 10 charts render correctly
- ✅ Counter operations work reliably
- ✅ Smooth navigation between routes
- ✅ Responsive on all screen sizes
- ✅ No console errors
- ✅ Follows project conventions

## Next Steps

1. Review this proposal
2. Get approval from team/stakeholders
3. Begin implementation following tasks.md
4. Create feature branch
5. Implement in phases
6. Test thoroughly
7. Create pull request
8. Deploy to production

## Questions or Feedback?

Please review the detailed specifications in the specs/ directory and provide feedback on:
- Technical approach
- Chart types and configurations
- API design
- Component architecture
- Timeline estimates
