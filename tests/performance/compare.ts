import type { PerfSource } from '../../src/lib/perf/telemetry';
import type { BenchmarkLogRow } from './logging';

export type BenchmarkComparison = {
  route: string;
  metric: string;
  source: PerfSource;
  regressed: boolean;
  currentMs: number;
  baselineMs: number;
};

export function compareAgainstBaseline(currentRows: BenchmarkLogRow[], baselineRows: BenchmarkLogRow[]) {
  return currentRows.map((row) => {
    const baseline = baselineRows.find((candidate) => (
      candidate.environment === row.environment
      && candidate.route === row.route
      && candidate.metric === row.metric
      && candidate.source === row.source
    ));

    return {
      route: row.route,
      metric: row.metric,
      source: row.source,
      regressed: baseline ? row.durationMs > baseline.durationMs : false,
      currentMs: row.durationMs,
      baselineMs: baseline?.durationMs ?? row.durationMs,
    } satisfies BenchmarkComparison;
  });
}
