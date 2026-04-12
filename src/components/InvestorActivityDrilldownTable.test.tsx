/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { afterEach, beforeEach, expect, mock, test } from "bun:test";

const actualReact = React;

let reactHooks: {
  useState?: <T>(initial: T | (() => T)) => readonly [T, (next: T | ((current: T) => T)) => void];
  useRef?: <T>(initial: T) => { current: T };
  useMemo?: <T>(factory: () => T, deps?: unknown[]) => T;
  useCallback?: <T extends (...args: any[]) => any>(callback: T, deps?: unknown[]) => T;
  useEffect?: (effect: () => void | (() => void), deps?: unknown[]) => void;
} = {};

let tablePropsHistory: any[] = [];
let queryCalls: Array<{ name: string; args: unknown[] }> = [];
let detailRows: any[] = [];
let detailResultType: "complete" | "unknown" = "complete";
let superinvestorRows: any[] = [];
let superinvestorResultType: "complete" | "unknown" = "complete";

mock.module("react", () => ({
  ...actualReact,
  useState(initial: unknown) {
    if (!reactHooks.useState) throw new Error("useState hook mock not installed");
    return reactHooks.useState(initial);
  },
  useRef(initial: unknown) {
    if (!reactHooks.useRef) throw new Error("useRef hook mock not installed");
    return reactHooks.useRef(initial);
  },
  useMemo(factory: () => unknown, deps?: unknown[]) {
    if (!reactHooks.useMemo) throw new Error("useMemo hook mock not installed");
    return reactHooks.useMemo(factory, deps);
  },
  useCallback(callback: (...args: any[]) => any, deps?: unknown[]) {
    if (!reactHooks.useCallback) throw new Error("useCallback hook mock not installed");
    return reactHooks.useCallback(callback, deps);
  },
  useEffect(effect: () => void | (() => void), deps?: unknown[]) {
    if (!reactHooks.useEffect) throw new Error("useEffect hook mock not installed");
    return reactHooks.useEffect(effect, deps);
  },
}));

mock.module("react-router-dom", () => ({
  Link: (props: any) => React.createElement("a", props, props.children),
  useParams: () => ({ code: "GBNK", cusip: "40075T102" }),
}));

mock.module("@/components/ui/card", () => ({
  Card: (props: any) => React.createElement("card", props, props.children),
  CardHeader: (props: any) => React.createElement("card-header", props, props.children),
  CardContent: (props: any) => React.createElement("card-content", props, props.children),
  CardDescription: (props: any) => React.createElement("card-description", props, props.children),
  CardTitle: (props: any) => React.createElement("card-title", props, props.children),
}));

mock.module("@/components/LatencyBadge", () => ({
  LatencyBadge: (props: any) => React.createElement("latency-badge", props),
}));

mock.module("@/components/LocalVirtualDataTable", () => ({
  LocalVirtualDataTable: (props: any) => {
    tablePropsHistory.push(props);
    return React.createElement("local-virtual-data-table", props);
  },
}));

mock.module("@rocicorp/zero/react", () => ({
  useQuery: (query: any) => {
    queryCalls.push({
      name: query.customQueryID?.name ?? "",
      args: query.customQueryID?.args ?? [],
    });

    if (
      query.customQueryID?.name === "investorActivity.drilldownByDetailRange"
      || query.customQueryID?.name === "investorActivity.drilldownByCusip"
      || query.customQueryID?.name === "investorActivity.drilldownByTicker"
    ) {
      return [detailRows, { type: detailResultType }];
    }

    if (query.customQueryID?.name === "superinvestors.byCiks") {
      const args = query.customQueryID?.args?.[0] as string[] | undefined;
      if (!args || args.length === 0) {
        return [[], { type: "complete" }];
      }
      return [superinvestorRows, { type: superinvestorResultType }];
    }

    return [[], { type: "complete" }];
  },
}));

function resetState() {
  reactHooks = {};
  tablePropsHistory = [];
  queryCalls = [];
  detailRows = [];
  detailResultType = "complete";
  superinvestorRows = [];
  superinvestorResultType = "complete";
}

beforeEach(() => {
  resetState();
});

afterEach(() => resetState());

async function createHookHarness(initialProps: {
  ticker: string;
  cusip: string | null;
  selection: { quarter: string; action: "open" | "close" };
  detailRange?: { minDetailId: number; maxDetailId: number } | null;
}) {
  const hookState: unknown[] = [];
  const hookDeps: Array<unknown[] | undefined> = [];
  const hookCleanups: Array<(() => void) | undefined> = [];
  let hookIndex = 0;
  let pendingEffects: Array<() => void> = [];
  let scheduledUpdate = false;
  let mounted = true;
  let props = initialProps;

  reactHooks = {
    useState<T>(initial: T | (() => T)) {
      const stateIndex = hookIndex++;
      if (!(stateIndex in hookState)) {
        hookState[stateIndex] = typeof initial === "function" ? (initial as () => T)() : initial;
      }
      const setState = (next: T | ((current: T) => T)) => {
        const current = hookState[stateIndex] as T;
        const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        if (mounted && !Object.is(current, resolved)) {
          hookState[stateIndex] = resolved;
          scheduledUpdate = true;
        }
      };
      return [hookState[stateIndex] as T, setState] as const;
    },
    useRef<T>(initial: T) {
      const refIndex = hookIndex++;
      if (!(refIndex in hookState)) hookState[refIndex] = { current: initial };
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
      const depsChanged = !previousDeps || !deps || deps.length !== previousDeps.length || deps.some((value, index) => !Object.is(value, previousDeps[index]));
      if (!depsChanged) return;
      hookDeps[effectIndex] = deps;
      pendingEffects.push(() => {
        hookCleanups[effectIndex]?.();
        const cleanup = effect();
        hookCleanups[effectIndex] = typeof cleanup === "function" ? cleanup : undefined;
      });
    },
  };

  const { InvestorActivityDrilldownTable } = await import("./InvestorActivityDrilldownTable");

  const renderNode = (node: any): any => {
    if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return node;
    if (Array.isArray(node)) return node.map(renderNode);
    if (typeof node.type === "function") return renderNode(node.type(node.props));
    const children = node.props?.children;
    if (children == null) return node;
    return { ...node, props: { ...node.props, children: Array.isArray(children) ? children.map(renderNode) : renderNode(children) } };
  };

  const render = () => {
    hookIndex = 0;
    pendingEffects = [];
    return renderNode(InvestorActivityDrilldownTable(props));
  };

  const flushEffects = () => {
    const effects = pendingEffects;
    pendingEffects = [];
    for (const effect of effects) effect();
  };

  const settle = async () => {
    let tree = render();
    flushEffects();
    await Promise.resolve();
    while (scheduledUpdate) {
      scheduledUpdate = false;
      tree = render();
      flushEffects();
      await Promise.resolve();
    }
    return tree;
  };

  return {
    settle,
    setProps(nextProps: typeof props) { props = nextProps; },
    unmount() { mounted = false; for (const cleanup of hookCleanups) cleanup?.(); },
  };
}

function findNode(node: any, type: string): any | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, type);
      if (found) return found;
    }
    return null;
  }
  if (node.type === type) return node;
  return findNode(node.props?.children, type);
}

test("wires the drilldown table through direct Zero detail queries", async () => {
  detailRows = [
    {
      id: 1,
      cusip: "69608A108",
      ticker: "PLTR",
      quarter: "2024Q3",
      cik: 1001,
      didOpen: true,
      didClose: false,
    },
    {
      id: 2,
      cusip: "69608A108",
      ticker: "PLTR",
      quarter: "2024Q3",
      cik: 1002,
      didOpen: true,
      didClose: false,
    },
  ];
  superinvestorRows = [
    {
      cik: "1001",
      cikName: "Alpha Capital",
      cikTicker: "ALPH",
    },
    {
      cik: "1002",
      cikName: "Beta Partners",
      cikTicker: "BETA",
    },
  ];

  const harness = await createHookHarness({
    ticker: "PLTR",
    cusip: "69608A108",
    selection: { quarter: "2024Q3", action: "open" },
    detailRange: { minDetailId: 1, maxDetailId: 10 },
  });

  try {
    await harness.settle();
    const tree = await harness.settle();
    const table = findNode(tree, "local-virtual-data-table");

    expect(queryCalls).toContainEqual({
      name: "investorActivity.drilldownByDetailRange",
      args: [1, 10, "open"],
    });
    expect(queryCalls).toContainEqual({
      name: "superinvestors.byCiks",
      args: [["1001", "1002"]],
    });
    expect(table?.props?.data).toEqual([
      {
        id: 1,
        cik: "1001",
        cikName: "Alpha Capital",
        cikTicker: "ALPH",
        quarter: "2024Q3",
        action: "open",
      },
      {
        id: 2,
        cik: "1002",
        cikName: "Beta Partners",
        cikTicker: "BETA",
        quarter: "2024Q3",
        action: "open",
      },
    ]);
  } finally {
    harness.unmount();
  }
});

test("shows a Zero-backed loading state while the direct detail query is still unknown", async () => {
  detailResultType = "unknown";

  const harness = await createHookHarness({
    ticker: "PLTR",
    cusip: "69608A108",
    selection: { quarter: "2024Q3", action: "open" },
    detailRange: { minDetailId: 1, maxDetailId: 10 },
  });

  try {
    await harness.settle();
    const tree = await harness.settle();
    const table = findNode(tree, "local-virtual-data-table");

    expect(table?.props?.emptyStateLabel).toBe("Loading drilldown…");
  } finally {
    harness.unmount();
  }
});

test("falls back to the CIK while superinvestor metadata is still syncing", async () => {
  detailRows = [
    {
      id: 1,
      cusip: "69608A108",
      ticker: "PLTR",
      quarter: "2024Q3",
      cik: 1001,
      didOpen: true,
      didClose: false,
    },
  ];
  superinvestorResultType = "unknown";

  const harness = await createHookHarness({
    ticker: "PLTR",
    cusip: "69608A108",
    selection: { quarter: "2024Q3", action: "open" },
    detailRange: { minDetailId: 1, maxDetailId: 10 },
  });

  try {
    const tree = await harness.settle();
    const table = findNode(tree, "local-virtual-data-table");

    expect(table?.props?.emptyStateLabel).toBe("No superinvestors found for this selection.");
    expect(table?.props?.data).toEqual([
      {
        id: 1,
        cik: "1001",
        cikName: "1001",
        cikTicker: "—",
        quarter: "2024Q3",
        action: "open",
      },
    ]);
  } finally {
    harness.unmount();
  }
});
