# UI Flash Fix: Visibility Pattern from zbugs

## Problem
When clicking browser refresh, the entire UI would flash/disappear briefly before reappearing with data. This happened even though:
- Search terms were preserved in URL
- Zero cached data in IndexedDB
- Data loaded quickly from cache

## Root Cause
The app rendered immediately with empty state, then re-rendered when data arrived from cache. This caused a visible "flash" of empty/loading UI.

## Solution: zbugs `visibility: hidden` Pattern

Inspired by the zbugs reference app, we implemented a pattern that hides the entire app until content is ready:

### 1. App Root Level (`main.tsx`)
```typescript
function AppContent() {
  const z = useZero<Schema>();
  initZero(z);

  // Prevent UI flash on refresh: hide until content is ready
  const [contentReady, setContentReady] = useState(false);
  const onReady = () => setContentReady(true);

  return (
    <BrowserRouter>
      <div style={{ visibility: contentReady ? 'visible' : 'hidden' }}>
        <GlobalNav />
        <Routes>
          <Route path="/" element={<HomePage onReady={onReady} />} />
          <Route path="/assets" element={<AssetsTablePage onReady={onReady} />} />
          {/* ... other routes */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

**Key points:**
- Use `visibility: hidden` (not `display: none`) to maintain layout
- Container is hidden until `contentReady` is true
- Each page receives `onReady` callback

### 2. Page Components Signal When Ready

Each page calls `onReady()` when data is available:

**Data-driven pages** (AssetsTable, SuperinvestorsTable):
```typescript
export function AssetsTablePage({ onReady }: { onReady: () => void }) {
  const [assetsPageRows, assetsResult] = useQuery(
    queries.assetsPage(windowLimit, 0),
    { ttl: '5m', enabled: !trimmedSearch }
  );

  // Signal ready when data is available (from cache or server)
  useEffect(() => {
    if (assetsPageRows && assetsPageRows.length > 0 || assetsResult.type === 'complete') {
      onReady();
    }
  }, [assetsPageRows, assetsResult.type, onReady]);
  
  // ... rest of component
}
```

**Detail pages** (AssetDetail, SuperinvestorDetail):
```typescript
export function AssetDetailPage({ onReady }: { onReady: () => void }) {
  const [rows, result] = useQuery(
    queries.assetBySymbol(asset || ''),
    { enabled: Boolean(asset) }
  );

  const record = rows?.[0];

  // Signal ready when data is available (from cache or server)
  useEffect(() => {
    if (record || result.type === 'complete') {
      onReady();
    }
  }, [record, result.type, onReady]);
  
  // ... rest of component
}
```

**Data-driven page** (historical former charts demo page):
```typescript
export function HistoricalChartsDemoPage({ onReady }: { onReady: () => void }) {
  const [counterRows, counterResult] = useQuery(queries.counterCurrent("main"));
  const [quarters, quartersResult] = useQuery(queries.quartersSeries());

  // Signal ready when data is available (from cache or server)
  useEffect(() => {
    if (counterRows && counterRows.length > 0 && quarters && quarters.length > 0 || 
        (counterResult.type === 'complete' && quartersResult.type === 'complete')) {
      onReady();
    }
  }, [counterRows, quarters, counterResult.type, quartersResult.type, onReady]);
  
  // ... rest of component
}
```

**Static page** (UserProfile):
```typescript
export function UserProfile({ onReady }: { onReady: () => void }) {
  // Signal ready immediately for static page
  useEffect(() => {
    onReady();
  }, [onReady]);
  
  // ... rest of component
}
```

## How It Works

### On Initial Load:
1. App renders with `visibility: hidden`
2. Zero loads data from IndexedDB cache
3. Page component receives cached data
4. Page calls `onReady()`
5. App becomes visible with data already rendered

### On Refresh:
1. App renders with `visibility: hidden` (user sees blank page briefly)
2. Zero immediately loads from IndexedDB cache (< 50ms)
3. Page component receives cached data
4. Page calls `onReady()`
5. App becomes visible with data (no flash!)

## Key Differences from Previous Approach

**Before:**
- Rendered loading state → data arrives → re-render
- User saw: Empty UI → Loading spinner → Data (flash)

**After:**
- Hidden → data arrives → render with data → show
- User sees: Brief blank → Data (no flash)

## Why `visibility: hidden` vs `display: none`?

- `visibility: hidden`: Element takes up space, layout is calculated
- `display: none`: Element removed from layout

Using `visibility` ensures:
- Layout is ready when content becomes visible
- No layout shift when transitioning
- Smoother visual experience

## Inspiration: zbugs Reference App

This pattern is used in the official Zero reference app `zbugs`:

**`apps/zbugs/src/root.tsx`:**
```typescript
export function Root() {
  const [contentReady, setContentReady] = useState(false);

  return (
    <div style={{visibility: contentReady ? 'visible' : 'hidden'}}>
      <Route path="/">
        <ListPage onReady={() => setContentReady(true)} />
      </Route>
    </div>
  );
}
```

**`apps/zbugs/src/pages/list/list-page.tsx`:**
```typescript
export function ListPage({onReady}: {onReady: () => void}) {
  const [issues, issuesResult] = useQuery(q);

  useEffect(() => {
    if (issues.length > 0 || issuesResult.type === 'complete') {
      onReady();
    }
  }, [issues.length, issuesResult.type, onReady]);
  
  // ...
}
```

## Files Modified

- `src/main.tsx` - Added contentReady state and visibility wrapper
- `src/pages/AssetsTable.tsx` - Added onReady prop and signal
- `src/pages/SuperinvestorsTable.tsx` - Added onReady prop and signal
- `src/pages/AssetDetail.tsx` - Added onReady prop and signal
- `src/pages/SuperinvestorDetail.tsx` - Added onReady prop and signal
- `the former charts demo component` - Added onReady prop (immediate)
- `src/pages/UserProfile.tsx` - Added onReady prop (immediate)

## Result

✅ No UI flash on page refresh
✅ Search terms preserved in URL
✅ Data loads instantly from cache
✅ Smooth user experience
