import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(import.meta.dir, '..', '..');

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), 'utf8');
}

describe('performance benchmark contracts', () => {
  test('performance harness defines shared route coverage for dev and prod', () => {
    const routes = readProjectFile('tests/performance/routes.ts');

    expect(routes).toContain("environment: 'dev'");
    expect(routes).toContain("environment: 'prod'");
    expect(routes).toContain("route: '/assets'");
    expect(routes).toContain("route: '/assets/GBNK/40075T102'");
    expect(routes).toContain("route: '/superinvestors'");
    expect(routes).toContain("route: '/superinvestors/9235'");
    expect(routes).toContain("metric: 'search'");
  });

  test('performance harness reuses the shared three-source telemetry core', () => {
    const runner = readProjectFile('tests/performance/run-benchmarks.ts');
    const logging = readProjectFile('tests/performance/logging.ts');
    const compare = readProjectFile('tests/performance/compare.ts');

    expect(runner).toContain("from '../../src/lib/perf/telemetry'");
    expect(logging).toContain("from '../../src/lib/perf/telemetry'");
    expect(compare).toContain("import type { PerfSource }");
    expect(compare).toContain("source: PerfSource");
  });

  test('performance log directory is present for arrow benchmark output', () => {
    const logging = readProjectFile('tests/performance/logging.ts');

    expect(existsSync(join(projectRoot, 'tests/performance/performance_logs'))).toBe(true);
    expect(existsSync(join(projectRoot, 'tests/performance/performance_logs/.gitkeep'))).toBe(true);
    expect(logging).toContain('writeArrowLog');
    expect(logging).toContain('pyarrow');
  });

  test('generated benchmark logs stay untracked while the log directory remains committed', () => {
    const gitignore = readProjectFile('.gitignore');

    expect(gitignore).toContain('tests/performance/performance_logs/latest.arrow');
    expect(gitignore).toContain('tests/performance/performance_logs/latest.arrow.json');
    expect(existsSync(join(projectRoot, 'tests/performance/performance_logs/.gitkeep'))).toBe(true);
  });

  test('package scripts expose benchmark run and comparison commands', () => {
    const packageJson = readProjectFile('package.json');

    expect(packageJson).toContain('"perf:run"');
    expect(packageJson).toContain('"perf:compare"');
    expect(packageJson).toContain('"test:performance-contract"');
  });
});
