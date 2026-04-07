# Counter API Specification

## Overview
RESTful API endpoints for managing a simple counter with increment and decrement operations. The counter persists in PostgreSQL and can be accessed/modified via HTTP requests.

## Database Schema

### Table: `counters`
```sql
CREATE TABLE IF NOT EXISTS counters (
  id TEXT PRIMARY KEY,
  value DOUBLE PRECISION NOT NULL
);

INSERT INTO counters (id, value)
VALUES ('main', 0)
ON CONFLICT (id) DO NOTHING;
```

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Counter identifier (e.g., "main")
- `value` (DOUBLE PRECISION) - Current counter value

**Seed Data:**
- Single counter with id="main" initialized to 0

## API Endpoints

### GET /apithe former charts demo route
Retrieve the current counter value.

**Request:**
- Method: `GET`
- Path: `/apithe former charts demo route`
- Headers: None required
- Body: None

**Response:**
- Status: `200 OK`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "value": 42
  }
  ```

**Error Responses:**
- `500 Internal Server Error` - Database query failed
  ```json
  {
    "error": "Failed to fetch counter"
  }
  ```

### POST /apithe former charts demo route
Increment or decrement the counter value.

**Request:**
- Method: `POST`
- Path: `/apithe former charts demo route`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "op": "inc"
  }
  ```
  or
  ```json
  {
    "op": "dec"
  }
  ```

**Request Body Schema:**
- `op` (string, required) - Operation to perform: `"inc"` or `"dec"`

**Response:**
- Status: `200 OK`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "value": 43
  }
  ```

**Error Responses:**
- `400 Bad Request` - Invalid operation
  ```json
  {
    "error": "Invalid operation. Must be 'inc' or 'dec'"
  }
  ```
- `500 Internal Server Error` - Database update failed
  ```json
  {
    "error": "Failed to update counter"
  }
  ```

## Implementation Details

### Hono Route Handler
Location: `api/routesthe former charts demo route.ts`

```typescript
import { Hono } from "hono";
import { sql } from "postgres";

const counter = new Hono();

counter.get("/", async (c) => {
  const result = await db.query(
    sql`SELECT value FROM counters WHERE id = 'main'`
  );
  
  if (result.rows.length === 0) {
    return c.json({ error: "Counter not found" }, 404);
  }
  
  return c.json({ value: result.rows[0].value });
});

counter.post("/", async (c) => {
  const body = await c.req.json();
  const { op } = body;
  
  if (op !== "inc" && op !== "dec") {
    return c.json({ error: "Invalid operation. Must be 'inc' or 'dec'" }, 400);
  }
  
  const delta = op === "inc" ? 1 : -1;
  
  const result = await db.query(
    sql`
      UPDATE counters 
      SET value = value + ${delta}
      WHERE id = 'main'
      RETURNING value
    `
  );
  
  if (result.rows.length === 0) {
    return c.json({ error: "Counter not found" }, 404);
  }
  
  return c.json({ value: result.rows[0].value });
});

export default counter;
```

### Client Service
Location: `src/servicesthe former charts demo route.ts`

```typescript
export async function getValue(): Promise<number> {
  const res = await fetch("/apithe former charts demo route");
  if (!res.ok) throw new Error(`Failed to fetch counter: ${res.status}`);
  const data = (await res.json()) as { value: number };
  return data.value;
}

export async function increment(): Promise<number> {
  return mutate("inc");
}

export async function decrement(): Promise<number> {
  return mutate("dec");
}

async function mutate(op: "inc" | "dec"): Promise<number> {
  const res = await fetch("/apithe former charts demo route", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op }),
  });
  if (!res.ok) throw new Error(`Failed to mutate counter: ${res.status}`);
  const data = (await res.json()) as { value: number };
  return data.value;
}
```

## Database Connection

The API handlers will use the existing PostgreSQL connection from the Hono server. Connection details are provided via environment variables:
- `ZERO_UPSTREAM_DB` - PostgreSQL connection string

## Testing

### Manual Testing
```bash
# Get counter value
curl http://localhost:4000/apithe former charts demo route

# Increment counter
curl -X POST http://localhost:4000/apithe former charts demo route \
  -H "Content-Type: application/json" \
  -d '{"op":"inc"}'

# Decrement counter
curl -X POST http://localhost:4000/apithe former charts demo route \
  -H "Content-Type: application/json" \
  -d '{"op":"dec"}'
```

### Expected Behavior
1. Initial GET returns `{"value": 0}`
2. POST with `{"op":"inc"}` returns `{"value": 1}`
3. POST with `{"op":"inc"}` returns `{"value": 2}`
4. POST with `{"op":"dec"}` returns `{"value": 1}`
5. Subsequent GET returns `{"value": 1}`

## Security Considerations
- No authentication required (matches existing messaging app pattern)
- Rate limiting should be considered for production use
- Input validation ensures only "inc" or "dec" operations
- SQL injection prevented by parameterized queries

## Performance Considerations
- Single row update is fast (< 1ms typical)
- No complex joins or aggregations
- Consider adding index on `id` column (already primary key)
- For high-concurrency scenarios, consider optimistic locking or atomic operations

## Future Enhancements
- Support multiple named counters (not just "main")
- Add counter reset endpoint
- Add counter history/audit log
- Integrate with Zero mutations for real-time sync across clients
- Add WebSocket support for live counter updates
