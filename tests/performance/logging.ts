import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { PerfSource } from '../../src/lib/perf/telemetry';

export type BenchmarkLogRow = {
  timestamp: string;
  environment: 'dev' | 'prod';
  route: string;
  metric: string;
  source: PerfSource;
  durationMs: number;
};

export const performanceLogsDir = join(import.meta.dir, 'performance_logs');

export function ensurePerformanceLogsDir() {
  mkdirSync(performanceLogsDir, { recursive: true });
}

export function writeArrowLog(fileName: string, rows: BenchmarkLogRow[]) {
  ensurePerformanceLogsDir();

  const outputPath = join(performanceLogsDir, fileName);
  const pythonScript = [
    'from pathlib import Path',
    'import json',
    'import pyarrow as pa',
    'import pyarrow.ipc as ipc',
    'rows = json.loads(Path("/dev/stdin").read_text())',
    `out = Path(${JSON.stringify(outputPath)})`,
    'table = pa.Table.from_pylist(rows)',
    'with out.open("wb") as fh:',
    '    with ipc.new_file(fh, table.schema) as writer:',
    '        writer.write(table)',
    'print(out)',
  ].join('\n');

  const result = spawnSync('python3', ['-c', pythonScript], {
    input: JSON.stringify(rows),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to write Arrow log');
  }

  return outputPath;
}

export function writeJsonLog(fileName: string, rows: BenchmarkLogRow[]) {
  ensurePerformanceLogsDir();
  const outputPath = join(performanceLogsDir, fileName);
  writeFileSync(outputPath, JSON.stringify(rows, null, 2));
  return outputPath;
}
