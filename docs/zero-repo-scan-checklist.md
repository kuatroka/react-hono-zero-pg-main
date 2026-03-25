# Zero Repo Scan Checklist

Use this checklist when scanning repos under `/Users/yo_macbook/Documents/dev` for Zero-based apps that may need rescue or upgrade work.

## Discovery

### Dependency signatures
```bash
rg -n '"@rocicorp/zero"' . --glob '*/package.json'
```

### Script signatures
```bash
rg -n 'dev:zero-cache|zero-cache-dev|zero-cache' . --glob '*/package.json'
```

### Env signatures
```bash
rg -n 'ZERO_|VITE_PUBLIC_SERVER|VITE_ZERO_GET_QUERIES_URL|ZERO_QUERY_URL' . --glob '*/.env'
```

### Code signatures
```bash
rg -n '@rocicorp/zero|ZeroProvider|useZero|useQuery|syncedQuery' . --glob '!**/node_modules/**'
```

## Triage

For each candidate repo, answer:
- Does `package.json` still include `@rocicorp/zero`?
- Is the repo live on Zero, partially migrated, or only containing historical docs?
- Are there startup scripts for API, UI, and zero-cache?
- Do env files indicate custom query wiring?

## Runtime validation

### Confirm actual listeners
```bash
lsof -nP -iTCP:3001 -iTCP:3003 -iTCP:4000 -iTCP:4001 -iTCP:4848 -iTCP:4849 -sTCP:LISTEN
```
Adjust ports per repo as needed.

### Probe API and query endpoints
```bash
curl -i http://localhost:<api-port>/api/login || true
curl -i -X POST http://localhost:<api-port>/api/zero/get-queries -H 'content-type: application/json' --data '{}' || true
```

### Browser checks
- Open the UI
- Check DevTools Network for `get-queries`
- Check console errors
- Verify whether the browser is using the exact absolute query URL that Zero Cache is configured to allow

### Zero cache checks
- Inspect zero-cache startup logs
- Confirm it binds `:4848`
- Watch for env deprecations and upstream replication errors

## Smoke path

Verify at least:
1. one list/search page with real rows
2. one detail page with real record data
3. one chart or visualization with live data
4. one successful transformed query response through the browser-facing `/api` path

## Common rescue pattern

If the UI renders but data is blank:
- confirm whether `VITE_ZERO_GET_QUERIES_URL` exactly matches `ZERO_QUERY_URL`
- use the absolute API URL that Zero Cache is allowed to call (for this repo: `http://localhost:4001/api/zero/get-queries`)
- use `ZERO_QUERY_URL` for Zero 1.x server-side query configuration
- verify transformed query responses before changing broader app logic

## Upgrade checklist

- Rescue current version first
- Confirm latest stable Zero version
- Upgrade dependency and lockfile
- Replace deprecated env names (`ZERO_GET_QUERIES_URL` → `ZERO_QUERY_URL`, `ZERO_GET_QUERIES_FORWARD_COOKIES` → `ZERO_QUERY_FORWARD_COOKIES`)
- Re-run smoke path
- Update README with real ports and commands
