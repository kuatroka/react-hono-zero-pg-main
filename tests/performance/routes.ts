export type BenchmarkRoute = {
  environment: 'dev' | 'prod';
  route: string;
  metric: 'table' | 'detail' | 'search' | 'render';
};

export const benchmarkRoutes: BenchmarkRoute[] = [
  { environment: 'dev', route: '/assets', metric: 'table' },
  { environment: 'dev', route: '/assets', metric: 'search' },
  { environment: 'dev', route: '/assets/GBNK/40075T102', metric: 'detail' },
  { environment: 'dev', route: '/superinvestors', metric: 'table' },
  { environment: 'dev', route: '/superinvestors', metric: 'search' },
  { environment: 'dev', route: '/superinvestors/9235', metric: 'detail' },
  { environment: 'prod', route: '/assets', metric: 'table' },
  { environment: 'prod', route: '/assets', metric: 'search' },
  { environment: 'prod', route: '/assets/GBNK/40075T102', metric: 'detail' },
  { environment: 'prod', route: '/superinvestors', metric: 'table' },
  { environment: 'prod', route: '/superinvestors', metric: 'search' },
  { environment: 'prod', route: '/superinvestors/9235', metric: 'detail' },
];
