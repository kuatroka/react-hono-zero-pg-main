/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { beforeEach, expect, mock, test } from "bun:test";

type InvestorActivityAction = "open" | "close";

type ActivityRow = {
  id: number;
  cusip: string;
  ticker: string;
  quarter: string;
  numOpen: number;
  numClose: number;
};

type MockQuery = {
  customQueryID?: {
    name: string;
    args: unknown[];
  };
};

let currentParams: { code?: string; cusip?: string } = {};
let currentAssetRows: Array<{ id: number; asset: string; assetName: string; cusip: string }> = [];
let currentActivityRows: ActivityRow[] = [];
let currentDrilldownRows: Array<{ id: number; cik: number; quarter: string; cusip: string | null; ticker: string }> = [];
let currentSuperinvestorRows: Array<{ cik: string; cikName: string; cikTicker: string }> = [];
let uplotRendered = false;
let chartProps: any = null;
let drilldownProps: any = null;
const actualReact = React;
let reactHooks: {
  memo?: (componentFn: any) => any;
  useState?: <T>(initial: T | (() => T)) => readonly [T, (next: T | ((current: T) => T)) => void];
  useRef?: <T>(initial: T) => { current: T };
  useMemo?: <T>(factory: () => T, deps?: unknown[]) => T;
  useCallback?: <T extends (...args: any[]) => any>(callback: T, deps?: unknown[]) => T;
  useEffect?: (effect: () => void | (() => void), deps?: unknown[]) => void;
} = {};

mock.module("react", () => ({
  ...actualReact,
  memo: (componentFn: any) => reactHooks.memo?.(componentFn) ?? componentFn,
  useState(initial: unknown) {
    if (!reactHooks.useState) {
      throw new Error("useState hook mock not installed");
    }
    return reactHooks.useState(initial);
  },
  useRef(initial: unknown) {
    if (!reactHooks.useRef) {
      throw new Error("useRef hook mock not installed");
    }
    return reactHooks.useRef(initial);
  },
  useMemo(factory: () => unknown, deps?: unknown[]) {
    if (!reactHooks.useMemo) {
      throw new Error("useMemo hook mock not installed");
    }
    return reactHooks.useMemo(factory, deps);
  },
  useCallback(callback: (...args: any[]) => any, deps?: unknown[]) {
    if (!reactHooks.useCallback) {
      throw new Error("useCallback hook mock not installed");
    }
    return reactHooks.useCallback(callback, deps);
  },
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
    if (!reactHooks.useEffect) {
      throw new Error("useEffect hook mock not installed");
    }
    return reactHooks.useEffect(effect, deps);
  },
}));

function resetState() {
  currentParams = { code: "GBNK", cusip: "40075T102" };
  currentAssetRows = [{ id: 1, asset: "GBNK", assetName: "Green Bank", cusip: "40075T102" }];
  currentActivityRows = [];
  currentDrilldownRows = [];
  currentSuperinvestorRows = [];
  uplotRendered = false;
  chartProps = null;
  drilldownProps = null;
}

function registerModuleMocks() {
  mock.module("react-router-dom", () => ({
    Link: (props: any) => React.createElement("a", props, props.children),
    useParams: () => currentParams,
  }));

  mock.module("@rocicorp/zero/react", () => ({
    useQuery: (query: MockQuery) => {
      const name = query.customQueryID?.name ?? "";

      switch (name) {
        case "assets.bySymbolAndCusip":
        case "assets.bySymbol":
          return [currentAssetRows, { type: currentAssetRows.length > 0 ? "complete" : "unknown" }];

        case "investorActivity.byCusip":
        case "investorActivity.byTicker":
          return [currentActivityRows, { type: currentActivityRows.length > 0 ? "complete" : "unknown" }];

        case "investorActivity.drilldownBySelection": {
          const [, cusip, quarter] = query.customQueryID?.args ?? [];
          const rows = currentDrilldownRows.filter((row) => row.quarter === quarter && (cusip == null ? true : row.cusip === cusip));
          return [rows, { type: rows.length > 0 ? "complete" : "unknown" }];
        }

        case "superinvestors.byCiks": {
          const [ciks] = query.customQueryID?.args ?? [[]];
          const selected = new Set(Array.isArray(ciks) ? ciks.map(String) : []);
          const rows = currentSuperinvestorRows.filter((row) => selected.has(row.cik));
          return [rows, { type: rows.length > 0 ? "complete" : "unknown" }];
        }

        default:
          return [[], { type: "complete" }];
      }
    },
  }));

  mock.module("@/lib/latency", () => ({
    useLatencyMs: () => 0,
  }));

  mock.module("@/components/charts/InvestorActivityUplotChart", () => ({
    InvestorActivityUplotChart: () => {
      uplotRendered = true;
      return React.createElement("div", null, "uplot");
    },
  }));

  mock.module("@/components/charts/InvestorActivityEchartsChart", () => ({
    InvestorActivityEchartsChart: (props: any) => {
      chartProps = props;
      return React.createElement(
        "button",
        {
          type: "button",
          onClick: () => props.onBarClick?.({ quarter: "2024Q2", action: "close" }),
        },
        "chart"
      );
    },
  }));

  mock.module("@/components/InvestorActivityDrilldownTable", () => ({
    InvestorActivityDrilldownTable: (props: any) => {
      drilldownProps = props;
      return React.createElement("div", props, "drilldown");
    },
  }));
}

beforeEach(async () => {
  resetState();
  registerModuleMocks();
});

async function createHookHarness(props: any) {
  const hookState: unknown[] = [];
  const hookDeps: Array<unknown[] | undefined> = [];
  const hookCleanups: Array<(() => void) | undefined> = [];
  let hookIndex = 0;
  let pendingEffects: Array<() => void> = [];
  let scheduledUpdate = false;
  let mounted = true;

  reactHooks = {
    memo: (componentFn: any) => componentFn,
    useState<T>(initial: T | (() => T)) {
      const stateIndex = hookIndex++;
      if (!(stateIndex in hookState)) {
        hookState[stateIndex] = typeof initial === "function" ? (initial as () => T)() : initial;
      }

      const setState = (next: T | ((current: T) => T)) => {
        const current = hookState[stateIndex] as T;
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        if (!mounted) {
          return;
        }
        if (!Object.is(current, resolved)) {
          hookState[stateIndex] = resolved;
          scheduledUpdate = true;
        }
      };

      return [hookState[stateIndex] as T, setState] as const;
    },
    useRef<T>(initial: T) {
      const refIndex = hookIndex++;
      if (!(refIndex in hookState)) {
        hookState[refIndex] = { current: initial };
      }
      return hookState[refIndex] as { current: T };
    },
    useMemo<T>(factory: () => T, deps?: unknown[]) {
      const memoIndex = hookIndex++;
      const current = hookState[memoIndex] as { deps?: unknown[]; value: T } | undefined;
      if (current && deps && current.deps && deps.length === current.deps.length && deps.every((value, index) => Object.is(value, current.deps?.[index]))) {
        return current.value;
      }
      const value = factory();
      hookState[memoIndex] = { deps, value };
      return value;
    },
    useCallback<T extends (...args: any[]) => any>(callback: T, deps?: unknown[]) {
      const callbackIndex = hookIndex++;
      const current = hookState[callbackIndex] as { deps?: unknown[]; value: T } | undefined;
      if (current && deps && current.deps && deps.length === current.deps.length && deps.every((value, index) => Object.is(value, current.deps?.[index]))) {
        return current.value;
      }
      hookState[callbackIndex] = { deps, value: callback };
      return callback;
    },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const effectIndex = hookIndex++;
      const previousDeps = hookDeps[effectIndex];
      const depsChanged =
        !previousDeps ||
        !deps ||
        deps.length !== previousDeps.length ||
        deps.some((value, index) => !Object.is(value, previousDeps[index]));
      if (!depsChanged) {
        return;
      }

      hookDeps[effectIndex] = deps;
      pendingEffects.push(() => {
        hookCleanups[effectIndex]?.();
        const cleanup = effect();
        hookCleanups[effectIndex] = typeof cleanup === "function" ? cleanup : undefined;
      });
    },
  };

  const { AssetDetailPage } = await import("./AssetDetail");

  const renderNode = (node: any): any => {
    if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map(renderNode);
    }

    if (typeof node.type === "function") {
      return renderNode(node.type(node.props));
    }

    const children = node.props?.children;
    if (children == null) {
      return node;
    }

    return {
      ...node,
      props: {
        ...node.props,
        children: Array.isArray(children) ? children.map(renderNode) : renderNode(children),
      },
    };
  };

  const render = () => {
    hookIndex = 0;
    pendingEffects = [];
    return renderNode(AssetDetailPage(props));
  };

  const flushEffects = () => {
    const effects = pendingEffects;
    pendingEffects = [];
    for (const effect of effects) {
      effect();
    }
  };

  const settle = () => {
    const tree = render();
    flushEffects();
    while (scheduledUpdate) {
      scheduledUpdate = false;
      render();
      flushEffects();
    }
    return tree;
  };

  const unmount = () => {
    mounted = false;
    for (const cleanup of hookCleanups) {
      cleanup?.();
    }
  };

  return { render, flushEffects, settle, unmount };
}

test("defaults the drilldown to the latest quarter's open positions and removes the uPlot chart", async () => {
  currentActivityRows = [
    { id: 1, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q3", numOpen: 1, numClose: 0 },
    { id: 2, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q4", numOpen: 4, numClose: 2 },
  ];
  currentDrilldownRows = [
    { id: 101, cik: 123456, quarter: "2024Q4", cusip: "40075T102", ticker: "GBNK" },
    { id: 102, cik: 789012, quarter: "2024Q4", cusip: "40075T102", ticker: "GBNK" },
  ];
  currentSuperinvestorRows = [
    { cik: "123456", cikName: "Alpha Capital", cikTicker: "ALPH" },
    { cik: "789012", cikName: "Beta Partners", cikTicker: "BETA" },
  ];

  const harness = await createHookHarness({ onReady: () => undefined });
  harness.settle();

  expect(uplotRendered).toBe(false);
  expect(chartProps?.onBarClick).toBeTypeOf("function");
  expect(drilldownProps).toMatchObject({
    ticker: "GBNK",
    cusip: "40075T102",
    selection: {
      quarter: "2024Q4",
      action: "open",
    },
  });
});

test("falls back to closed positions when the latest quarter has no opens", async () => {
  currentActivityRows = [
    { id: 1, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q3", numOpen: 1, numClose: 0 },
    { id: 2, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q4", numOpen: 0, numClose: 3 },
  ];
  currentDrilldownRows = [
    { id: 201, cik: 222333, quarter: "2024Q4", cusip: "40075T102", ticker: "GBNK" },
  ];
  currentSuperinvestorRows = [
    { cik: "222333", cikName: "Gamma Fund", cikTicker: "GAM" },
  ];

  const harness = await createHookHarness({ onReady: () => undefined });
  harness.settle();

  expect(drilldownProps).toMatchObject({
    selection: {
      quarter: "2024Q4",
      action: "close",
    },
  });
});

test("clicking a bar in the eCharts chart replaces the default drilldown selection", async () => {
  currentActivityRows = [
    { id: 1, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q3", numOpen: 1, numClose: 0 },
    { id: 2, cusip: "40075T102", ticker: "GBNK", quarter: "2024Q4", numOpen: 4, numClose: 2 },
  ];
  currentDrilldownRows = [
    { id: 301, cik: 111111, quarter: "2024Q2", cusip: "40075T102", ticker: "GBNK" },
  ];
  currentSuperinvestorRows = [
    { cik: "111111", cikName: "Delta Ventures", cikTicker: "DELTA" },
  ];

  const harness = await createHookHarness({ onReady: () => undefined });
  harness.settle();

  chartProps.onBarClick?.({ quarter: "2024Q2", action: "close" } satisfies { quarter: string; action: InvestorActivityAction });
  harness.settle();

  expect(drilldownProps).toMatchObject({
    selection: {
      quarter: "2024Q2",
      action: "close",
    },
  });
});
