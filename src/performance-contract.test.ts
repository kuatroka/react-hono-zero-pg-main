import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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
    expect(globalSearch).not.toContain('params.set("q"');
    expect(globalSearch).not.toContain('params.delete("q"');
  });

  test("investor activity echarts chart uses a stable manual echarts lifecycle", () => {
    const chartSource = readProjectFile("src/components/charts/InvestorActivityEchartsChart.tsx");

    expect(chartSource).not.toContain("echarts-for-react");
    expect(chartSource).toContain("echarts.init");
    expect(chartSource).toContain("animation: false");
    expect(chartSource).toContain("ResizeObserver");
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

  test("app root does not wrap the router tree in StrictMode while using react-scan for render diagnostics", () => {
    const main = readProjectFile("src/main.tsx");

    expect(main).not.toContain("StrictMode");
  });
});
