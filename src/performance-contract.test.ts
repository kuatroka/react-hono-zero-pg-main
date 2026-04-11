import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("performance contracts", () => {
  test("react-scan script uses an explicit https URL so it loads in local dev", () => {
    const html = readProjectFile("index.html");

    expect(html).toContain('src="https://unpkg.com/react-scan/dist/auto.global.js"');
  });

  test("global search keeps transient query state local instead of rewriting router search params on each keystroke", () => {
    const globalSearch = readProjectFile("src/components/GlobalSearch.tsx");

    expect(globalSearch).not.toContain("useSearchParams");
    expect(globalSearch).not.toContain("setSearchParams");
    expect(globalSearch).not.toContain("useNavigate");
    expect(globalSearch).not.toContain('params.set("q"');
    expect(globalSearch).not.toContain('params.delete("q"');
  });

  test("global search isolates the input in its own memoized component", () => {
    const globalSearch = readProjectFile("src/components/GlobalSearch.tsx");

    expect(globalSearch).toContain("memo(function GlobalSearchInput");
    expect(globalSearch).toContain('const [inputValue, setInputValue] = useState("")');
    expect(globalSearch).toContain("clearSignal");
    expect(globalSearch).not.toContain("const deferredQuery = useDeferredValue(query)");
  });

  test("global search keeps query and keyboard callbacks in refs so search results do not rerender the input", () => {
    const globalSearch = readProjectFile("src/components/GlobalSearch.tsx");

    expect(globalSearch).toContain("const onQueryCommitRef = useRef(onQueryCommit)");
    expect(globalSearch).toContain("const onKeyActionRef = useRef(onKeyAction)");
    expect(globalSearch).toContain("setTimeout(() => {");
  });

  test("global search does not keep idle zero search subscriptions alive when the dropdown is closed", () => {
    const globalSearch = readProjectFile("src/components/GlobalSearch.tsx");

    expect(globalSearch).not.toContain('queries.searchesByCode("", 0)');
    expect(globalSearch).not.toContain('queries.searchesByName("", 0)');
    expect(globalSearch).toContain("enabled: shouldSearch");
  });

  test("global search keeps zero preloading inside the mounted results list instead of the idle navbar shell", () => {
    const globalSearch = readProjectFile("src/components/GlobalSearch.tsx");
    const globalSearchShell = globalSearch.split('export const GlobalSearch = memo(function GlobalSearch() {')[1] ?? "";

    expect(globalSearch).toContain("memo(function GlobalSearchResultsList");
    expect(globalSearchShell).not.toContain("useZero<Schema>()");
  });

  test("global nav isolates route-aware link state instead of subscribing the whole navbar to location changes", () => {
    const globalNav = readProjectFile("src/components/GlobalNav.tsx");

    expect(globalNav).not.toContain("useLocation");
    expect(globalNav).toContain("memo(function GlobalNavLink");
    expect(globalNav).toContain("<GlobalNavLink");
  });

  test("global nav avoids react-router Link subscriptions for the sticky shell and brand/profile anchors", () => {
    const globalNav = readProjectFile("src/components/GlobalNav.tsx");

    expect(globalNav).not.toContain("import { Link");
    expect(globalNav).not.toContain("<Link");
    expect(globalNav).toContain("memo(function RouterAnchor");
    expect(globalNav).toContain("navigateTo(to)");
  });

  test("theme switching lives in the global nav instead of route-level page headers", () => {
    const globalNav = readProjectFile("src/components/GlobalNav.tsx");
    const main = readProjectFile("src/main.tsx");

    expect(globalNav).toContain("ThemeSwitcher");
    expect(globalNav).toContain("<ThemeSwitcher />");
    expect(main).not.toContain('import { ThemeSwitcher }');
    expect(main).not.toContain("<ThemeSwitcher />");
    expect(globalNav.indexOf('to="/profile"')).toBeLessThan(globalNav.indexOf("<ThemeSwitcher />"));
  });

  test("router navigation is bridged once so global search can navigate without rerendering on route changes", () => {
    const main = readProjectFile("src/main.tsx");
    const navigationBridge = readProjectFile("src/lib/navigation.ts");

    expect(main).toContain("<RouterNavigationBridge />");
    expect(navigationBridge).toContain("useNavigate");
    expect(navigationBridge).toContain("export function navigateTo");
  });

  test("investor activity echarts chart uses a stable manual echarts lifecycle", () => {
    const chartSource = readProjectFile("src/components/charts/InvestorActivityEchartsChart.tsx");

    expect(chartSource).not.toContain("echarts-for-react");
    expect(chartSource).toContain("echarts.init");
    expect(chartSource).toContain("animation: false");
    expect(chartSource).toContain("ResizeObserver");
  });

  test("investor activity echarts chart initializes directly from the live container size instead of waiting on separate size state", () => {
    const chartSource = readProjectFile("src/components/charts/InvestorActivityEchartsChart.tsx");

    expect(chartSource).not.toContain("const [chartSize, setChartSize]");
    expect(chartSource).not.toContain("!chartSize");
    expect(chartSource).toContain("const syncChart = () =>");
    expect(chartSource).toContain("container.clientWidth || container.getBoundingClientRect().width");
    expect(chartSource).toContain("container.clientHeight || container.getBoundingClientRect().height");
  });

  test("assets and superinvestors page searches keep transient input out of the router state", () => {
    const assetsTable = readProjectFile("src/pages/AssetsTable.tsx");
    const superinvestorsTable = readProjectFile("src/pages/SuperinvestorsTable.tsx");

    expect(assetsTable).not.toContain("get('search')");
    expect(assetsTable).not.toContain("set('search'");
    expect(superinvestorsTable).not.toContain("get('search')");
    expect(superinvestorsTable).not.toContain("set('search'");
  });

  test("data table debounces external search notifications to localize keystroke rerenders", () => {
    const dataTable = readProjectFile("src/components/DataTable.tsx");

    expect(dataTable).toContain("searchDebounceMs");
    expect(dataTable).toContain("setTimeout(() => {");
    expect(dataTable).toContain("onQueryCommit(inputValue)");
    expect(dataTable).not.toContain("handleSearch = (value: string)");
  });

  test("data table isolates the search input in its own memoized component", () => {
    const dataTable = readProjectFile("src/components/DataTable.tsx");

    expect(dataTable).toContain("memo(function DataTableSearchInput");
    expect(dataTable).toContain("const [inputValue, setInputValue]");
    expect(dataTable).toContain("onQueryCommit(inputValue)");
    expect(dataTable).toContain("<DataTableSearchInput");
  });

  test("data table keeps search callbacks in refs so parent table updates do not rerender the memoized search input", () => {
    const dataTable = readProjectFile("src/components/DataTable.tsx");

    expect(dataTable).toContain("const onSearchChangeRef = useRef(onSearchChange)");
    expect(dataTable).toContain("const onPageChangeRef = useRef(onPageChange)");
  });

  test("data table is memoized so route-level state changes do not rerender the whole table", () => {
    const dataTable = readProjectFile("src/components/DataTable.tsx");

    expect(dataTable).toContain("memo(DataTableInner)");
    expect(dataTable).toContain("MemoizedDataTable.displayName = 'DataTable'");
  });

  test("assets and superinvestors pages delegate virtualized search and sorting to a zero-virtual table instead of owning paginated table state", () => {
    const assetsTable = readProjectFile("src/pages/AssetsTable.tsx");
    const superinvestorsTable = readProjectFile("src/pages/SuperinvestorsTable.tsx");

    expect(assetsTable).toContain("ZeroVirtualDataTable");
    expect(superinvestorsTable).toContain("ZeroVirtualDataTable");
    expect(assetsTable).not.toContain("<DataTable");
    expect(superinvestorsTable).not.toContain("<DataTable");
    expect(assetsTable).not.toContain("const [searchTerm, setSearchTerm]");
    expect(superinvestorsTable).not.toContain("const [searchTerm, setSearchTerm]");
    expect(assetsTable).not.toContain("useSearchParams");
    expect(superinvestorsTable).not.toContain("useSearchParams");
  });

  test("zero-virtual table isolates the compact header search and defaults to a 10-row viewport without pagination controls", () => {
    const zeroVirtualTablePath = join(projectRoot, "src/components/ZeroVirtualDataTable.tsx");

    expect(existsSync(zeroVirtualTablePath)).toBe(true);

    if (!existsSync(zeroVirtualTablePath)) {
      return;
    }

    const zeroVirtualTable = readProjectFile("src/components/ZeroVirtualDataTable.tsx");

    expect(zeroVirtualTable).toContain("useZeroVirtualizer");
    expect(zeroVirtualTable).toContain("useHistoryScrollState");
    expect(zeroVirtualTable).toContain("memo(function ZeroVirtualTableSearchInput");
    expect(zeroVirtualTable).toContain("const DEFAULT_VISIBLE_ROW_COUNT = 10");
    expect(zeroVirtualTable).toContain("const DEFAULT_MIN_SEARCH_LENGTH = 2");
    expect(zeroVirtualTable).toContain("memo(function ZeroVirtualTableHeaderSearch");
    expect(zeroVirtualTable).toContain("searchPlaceholder = 'Search...'");
    expect(zeroVirtualTable).toContain("history.replaceState({ ...window.history.state, [historyKey]: null }, '')");
    expect(zeroVirtualTable).toContain("if (event.key === 'Enter' && onEnter) {");
    expect(zeroVirtualTable).toContain("<LatencyBadge telemetry={telemetry} />");
    expect(zeroVirtualTable).toContain("normalizedValue.length >= minSearchLength ? normalizedValue : ''");
    expect(zeroVirtualTable).toContain("requestAnimationFrame(() => {");
    expect(zeroVirtualTable).toContain("inputRef.current?.focus()");
    expect(zeroVirtualTable).toContain("document.addEventListener('pointerdown', handlePointerDown)");
    expect(zeroVirtualTable).not.toContain("comparisonSearchLabel?: string");
    expect(zeroVirtualTable).not.toContain("ChevronsLeft");
    expect(zeroVirtualTable).not.toContain("Rows per page");
    expect(zeroVirtualTable).not.toContain("Page ");
  });

  test("zero-virtual table keeps scroll-driven virtualizer state inside a dedicated viewport so the toolbar and sort chrome stay isolated", () => {
    const zeroVirtualTable = readProjectFile("src/components/ZeroVirtualDataTable.tsx");
    const outerComponent = zeroVirtualTable.split("function ZeroVirtualDataTableInner")[1] ?? "";

    expect(zeroVirtualTable).toContain("memo(function ZeroVirtualTableToolbar");
    expect(zeroVirtualTable).toContain("function ZeroVirtualTableHeaderInner");
    expect(zeroVirtualTable).toContain("const ZeroVirtualTableHeader = memo(");
    expect(zeroVirtualTable).toContain("function ZeroVirtualTableViewportInner");
    expect(zeroVirtualTable).toContain("const ZeroVirtualTableViewport = memo(");
    expect(zeroVirtualTable).toContain("onReadyChange");
    expect(outerComponent).not.toContain("useZeroVirtualizer<");
  });

  test("zero query contracts support zero-virtual start-row pagination for assets and superinvestors", () => {
    const zeroQueries = readProjectFile("src/zero/queries.ts");

    expect(zeroQueries).toContain("assetsVirtualPage");
    expect(zeroQueries).toContain("assetsVirtualRowById");
    expect(zeroQueries).toContain("superinvestorsVirtualPage");
    expect(zeroQueries).toContain("superinvestorsVirtualRowById");
    expect(zeroQueries).toContain(".start(start, { inclusive: false })");
    expect(zeroQueries).toContain("dir === \"forward\"");
  });

  test("assets and superinvestors cards drop the subtitle once the table owns the search UX", () => {
    const assetsTable = readProjectFile("src/pages/AssetsTable.tsx");
    const superinvestorsTable = readProjectFile("src/pages/SuperinvestorsTable.tsx");

    expect(assetsTable).not.toContain("CardDescription");
    expect(superinvestorsTable).not.toContain("CardDescription");
  });

  test("asset detail surfaces the eCharts investor activity chart and virtual drilldown table with shared latency telemetry", () => {
    const assetDetail = readProjectFile("src/pages/AssetDetail.tsx");
    const latencyBadge = readProjectFile("src/components/LatencyBadge.tsx");
    const latencyHook = readProjectFile("src/lib/latency.ts");
    const telemetryCore = readProjectFile("src/lib/perf/telemetry.ts");
    const echartsChart = readProjectFile("src/components/charts/InvestorActivityEchartsChart.tsx");
    const drilldownTable = readProjectFile("src/components/InvestorActivityDrilldownTable.tsx");
    const zeroVirtualTable = readProjectFile("src/components/ZeroVirtualDataTable.tsx");
    const selectionHelper = readProjectFile("src/lib/investor-activity-selection.ts");

    expect(assetDetail).toContain("const AssetDetailHeader = memo(function AssetDetailHeader");
    expect(assetDetail).toContain("const AssetDetailActivityGrid = memo(function AssetDetailActivityGrid");
    expect(assetDetail).toContain("const [selectedInvestorActivity, setSelectedInvestorActivity] = useState<{");
    expect(assetDetail).toContain("const [echartsRenderLatencyMs, setEchartsRenderLatencyMs] = useState<number | null>(null)");
    expect(assetDetail).toContain("const activityDataLatencyMs = useLatencyMs({");
    expect(assetDetail).toContain("const echartsTelemetry = useMemo(() => createPerfTelemetry({");
    expect(assetDetail).toContain("secondaryLabel: 'investorActivity: ECharts render'");
    expect(assetDetail).not.toContain("slice(-6)");
    expect(assetDetail).toContain("const defaultInvestorActivitySelection = resolveDefaultInvestorActivitySelection(activityRows);");
    expect(assetDetail).toContain("const resolvedInvestorActivitySelection = selectedInvestorActivity ?? defaultInvestorActivitySelection;");
    expect(assetDetail).toContain("<LatencyBadge telemetry={telemetry} />");
    expect(assetDetail).toContain("telemetry={echartsTelemetry}");
    expect(assetDetail).toContain("onRenderReady={setEchartsRenderLatencyMs}");
    expect(assetDetail).toContain("const handleInvestorActivityBarClick = useCallback");
    expect(assetDetail).toContain("onBarClick={handleInvestorActivityBarClick}");
    expect(assetDetail).toContain("InvestorActivityDrilldownTable");
    expect(assetDetail).toContain('className="grid w-full grid-cols-3 items-center');
    expect(assetDetail).toContain('&larr; Back to assets');
    expect(assetDetail).toContain('({asset}) {assetName}');
    expect(assetDetail).toContain('xl:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]');
    expect(assetDetail).toContain("No investor drilldown data available for this asset.");

    expect(latencyBadge).toContain("telemetry?: PerfTelemetry");
    expect(latencyBadge).toContain("primaryLine");
    expect(latencyBadge).toContain("secondaryLine");
    expect(latencyBadge).toContain("shrink-0");
    expect(latencyBadge).toContain("whitespace-nowrap");
    expect(telemetryCore).toContain("secondaryLabel?: string");
    expect(telemetryCore).toContain("secondaryLine = secondaryLabel");

    expect(latencyHook).toContain("export function resolveLatencyMs(");
    expect(latencyHook).toContain("minimumVisibleMs = 0.1");
    expect(latencyHook).toContain("setMs(resolveLatencyMs(startRef.current, performance.now(), minimumVisibleMs))");
    expect(latencyHook).not.toContain("setMs(0)");

    expect(echartsChart).toContain("telemetry?: PerfTelemetry");
    expect(echartsChart).toContain("onBarClick?: (selection: { quarter: string; action: \"open\" | \"close\" }) => void");
    expect(echartsChart).toContain("onRenderReady?: (renderLatencyMs: number) => void");
    expect(echartsChart).toContain("const renderStartMs = performance.now()");
    expect(echartsChart).toContain('onRenderReadyRef.current?.(resolveLatencyMs(renderStartMs))');
    expect(echartsChart).toContain("const handleChartClick = (params: { name?: string; seriesName?: string }) =>");
    expect(echartsChart).toContain("const onBarClickRef = useRef(onBarClick)");
    expect(echartsChart).toContain("const onRenderReadyRef = useRef(onRenderReady)");
    expect(echartsChart).toContain('chart.on("click", handleChartClick)');
    expect(echartsChart).toContain('chart.off("click", handleChartClick)');
    expect(echartsChart).toContain('chart.on("finished", handleChartFinished)');
    expect(echartsChart).toContain('chart.off("finished", handleChartFinished)');
    expect(echartsChart).toContain("Investor Activity for {ticker} (ECharts)");
    expect(echartsChart).not.toContain("slice(-6)");
    expect(echartsChart).not.toContain("Showing the latest 6 quarters.");
    expect(echartsChart).toContain('className="min-w-0 h-[450px] overflow-hidden"');

    expect(drilldownTable).toContain("searchPlaceholder=\"Search superinvestors...\"");
    expect(drilldownTable).toContain("queries.investorActivityDrilldownByCusip");
    expect(drilldownTable).toContain("queries.investorActivityDrilldownByTicker");
    expect(drilldownTable).toContain("queries.investorActivityDrilldownByDetailRange");
    expect(drilldownTable).toContain("queries.superinvestorsByCiks(ciks)");
    expect(drilldownTable).toContain("Superinvestors who");
    expect(drilldownTable).toContain("LatencyBadge telemetry={tableTelemetry}");
    expect(drilldownTable).toContain("const [detailRows, detailResult] = useQuery(");
    expect(drilldownTable).toContain("const [superinvestorRows, superinvestorResult] = useQuery(");
    expect(drilldownTable).toContain("LocalVirtualDataTable");
    expect(drilldownTable).not.toContain("<DataTable");
    expect(drilldownTable).toContain('className="min-w-0 h-[450px] overflow-hidden"');
    expect(drilldownTable).toContain("visibleRowCount={6}");
    expect(zeroVirtualTable).toContain("ZeroVirtualTableHeaderSearch");
    expect(zeroVirtualTable).toContain("Search className");
    expect(zeroVirtualTable).toContain("overflow-y-auto");
    expect(zeroVirtualTable).toContain("visibleRowCount = DEFAULT_VISIBLE_ROW_COUNT");
    expect(zeroVirtualTable).toContain("gridTemplateColumns");
    expect(selectionHelper).toContain("resolveDefaultInvestorActivitySelection");
  });

  test("table telemetry contracts use the shared three-source model and surface parent-card badges", () => {
    const assetsTable = readProjectFile("src/pages/AssetsTable.tsx");
    const superinvestorsTable = readProjectFile("src/pages/SuperinvestorsTable.tsx");
    const zeroVirtualTable = readProjectFile("src/components/ZeroVirtualDataTable.tsx");
    const latencyBadge = readProjectFile("src/components/LatencyBadge.tsx");
    const telemetryCore = readProjectFile("src/lib/perf/telemetry.ts");

    expect(telemetryCore).toContain("export type PerfSource = 'api:pg' | 'zero:cache' | 'zero-client'");
    expect(latencyBadge).toContain("primaryLine");
    expect(latencyBadge).toContain("secondaryLine");
    expect(latencyBadge).not.toContain("source.replace(/^Zero: /");

    expect(zeroVirtualTable).toContain("onTableTelemetryChange");
    expect(zeroVirtualTable).toContain("onSearchTelemetryChange");
    expect(zeroVirtualTable).toContain("tableTelemetry");
    expect(zeroVirtualTable).toContain("searchTelemetry");
    expect(zeroVirtualTable).toContain("searchTelemetryLabel = 'search'");
    expect(zeroVirtualTable).toContain("tableTelemetryLabel = 'table'");
    expect(zeroVirtualTable).toContain("const tableLatencyResetKey =");
    expect(zeroVirtualTable).toContain("const searchLatencyResetKey =");
    expect(zeroVirtualTable).toContain("const readyResetKey = `${tableLatencyResetKey}:${searchLatencyResetKey}`");
    expect(zeroVirtualTable).toContain("const tableLatencyMs = useLatencyMs({");
    expect(zeroVirtualTable).toContain("const searchLatencyMs = useLatencyMs({");
    expect(zeroVirtualTable).toContain("label: tableTelemetryLabel");
    expect(zeroVirtualTable).toContain("label: searchTelemetryLabel");
    expect(zeroVirtualTable).toContain("readyCalledRef.current = false");
    expect(zeroVirtualTable).toContain("useLayoutEffect(() => {");
    expect(zeroVirtualTable).toContain("}, [readyResetKey]);");
    expect(zeroVirtualTable).toContain("const isReady = rowsEmpty || complete || rowAt(0) !== undefined");
    expect(zeroVirtualTable).toContain("readyResetKey");
    expect(zeroVirtualTable).toContain("readyKey={readyResetKey}");
    expect(zeroVirtualTable).toContain("onReadyChange(isReady)");
    expect(zeroVirtualTable).toContain("}, [isReady, onReadyChange, readyKey]);");
    expect(zeroVirtualTable).toContain("listContextParams");
    expect(zeroVirtualTable).toContain("!onTableTelemetryChange ? <ZeroVirtualTableToolbar telemetry={tableTelemetry} /> : null");

    expect(assetsTable).toContain("const [tableTelemetry, setTableTelemetry]");
    expect(assetsTable).toContain("const [searchTelemetry, setSearchTelemetry]");
    expect(assetsTable).toContain("onTableTelemetryChange={setTableTelemetry}");
    expect(assetsTable).toContain("onSearchTelemetryChange={setSearchTelemetry}");
    expect(assetsTable).toContain("<LatencyBadge telemetry={tableTelemetry} className=\"min-w-[11rem] justify-end\" />");
    expect(assetsTable).toContain("<LatencyBadge telemetry={searchTelemetry} className=\"min-w-[11rem] justify-end\" />");
    expect(assetsTable).toContain("tableTelemetryLabel=\"virtual table\"");
    expect(assetsTable).toContain("searchTelemetryLabel=\"search\"");
    expect(assetsTable).not.toContain("latencySource=\"Zero: assets.virtualPage\"");

    expect(superinvestorsTable).toContain("const [tableTelemetry, setTableTelemetry]");
    expect(superinvestorsTable).toContain("const [searchTelemetry, setSearchTelemetry]");
    expect(superinvestorsTable).toContain("onTableTelemetryChange={setTableTelemetry}");
    expect(superinvestorsTable).toContain("onSearchTelemetryChange={setSearchTelemetry}");
    expect(superinvestorsTable).toContain("<LatencyBadge telemetry={tableTelemetry} className=\"min-w-[11rem] justify-end\" />");
    expect(superinvestorsTable).toContain("<LatencyBadge telemetry={searchTelemetry} className=\"min-w-[11rem] justify-end\" />");
    expect(superinvestorsTable).toContain("tableTelemetryLabel=\"virtual table\"");
    expect(superinvestorsTable).toContain("searchTelemetryLabel=\"search\"");
    expect(superinvestorsTable).not.toContain("latencySource=\"Zero: superinvestors.virtualPage\"");
  });

  test("app root does not wrap the router tree in StrictMode while using react-scan for render diagnostics", () => {
    const main = readProjectFile("src/main.tsx");

    expect(main).not.toContain("StrictMode");
  });
});
