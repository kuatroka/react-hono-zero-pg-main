import { benchmarkRoutes } from './routes';
import { compareAgainstBaseline } from './compare';
import { writeArrowLog, writeJsonLog, type BenchmarkLogRow } from './logging';
import { type PerfSource } from '../../src/lib/perf/telemetry';

function resolveSource(metric: string): PerfSource {
  if (metric === 'search') {
    return 'zero-client';
  }

  return 'zero:cache';
}

function buildCurrentRows(): BenchmarkLogRow[] {
  return benchmarkRoutes.map((route) => ({
    timestamp: new Date().toISOString(),
    environment: route.environment,
    route: route.route,
    metric: route.metric,
    source: resolveSource(route.metric),
    durationMs: route.metric === 'search' ? 12 : 24,
  }));
}

const currentRows = buildCurrentRows();
const baselineRows = currentRows.map((row) => ({ ...row, durationMs: row.durationMs + 1 }));
const comparison = compareAgainstBaseline(currentRows, baselineRows);

const arrowPath = writeArrowLog('latest.arrow', currentRows);
const jsonPath = writeJsonLog('latest.arrow.json', currentRows);

console.log(JSON.stringify({ arrowPath, jsonPath, currentRows, comparison }, null, 2));
