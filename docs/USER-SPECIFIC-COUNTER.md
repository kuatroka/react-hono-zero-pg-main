# User-Specific Counter Implementation

## Overview

Added a second counter that is private to each user and does not sync across different users. This counter is stored per-user and only visible to the logged-in user.

## Changes Made

### 1. Schema Updates (`src/schema.ts`)

**Added new table:**
```typescript
const userCounter = table("user_counters")
  .columns({
    userId: string().from("user_id"),
    value: number(),
  })
  .primaryKey("userId");
```

**Added permissions:**
- Users can only select, insert, and update their own counter rows
- Permission check: `userId` must match `authData.sub` (the logged-in user ID)

### 2. Database Migration (`docker/migrations/05_add_user_counters.sql`)

Created the `user_counters` table with:
- `user_id` (TEXT PRIMARY KEY) - The user's ID
- `value` (DOUBLE PRECISION) - The counter value

Seeded initial data for all existing users with value 0.

### 3. Query Definition (`src/zero/queries.ts`)

Added new synced query:
```typescript
userCounter: syncedQuery(
  "user_counter.current",
  z.tuple([z.string()]),
  (userId) => builder.user_counters.where("userId", "=", userId).limit(1)
)
```

### 4. UI Updates (`the former charts demo component`)

**Added:**
- Query for a user-specific counter using `z.userID`
- Increment/decrement handlers that create the row if it doesn't exist
- Second counter card with "Your Counter" label
- Different button styling (secondary color) to distinguish it from the former global counter

**Layout:**
- Changed to a 2-column grid layout on medium+ screens
- Former global counter on the left (primary color)
- Former user counter on the right (secondary color)

## How It Works

### Data Isolation

1. **Row-Level Security**: Zero's permissions system enforces that users can only access rows where `userId` matches their authenticated user ID (`authData.sub`)

2. **Query Filtering**: The synced query automatically filters by the current user's ID

3. **Mutation Validation**: Both pre and post mutation checks ensure the user can only modify their own counter

### First-Time Usage

When a user clicks the increment/decrement button for the first time:
- If their counter row doesn't exist, it's created with `insert()`
- If it exists, it's updated with `update()`

### Comparison with Global Counter

| Feature | Global Counter | User Counter |
|---------|---------------|--------------|
| Table | `counters` | `user_counters` |
| Visibility | All users see the same value | Each user sees only their own value |
| Permissions | `ANYONE_CAN` update | Only owner can update |
| Primary Key | `id` (e.g., "main") | `userId` |
| Button Color | Primary (blue) | Secondary (purple) |

## Testing

To test the user-specific counter:

1. **Restart the database** to apply the migration:
   ```bash
   cd docker
   docker compose down -v
   docker compose up -d
   ```

2. **Restart the dev server** to pick up schema changes:
   ```bash
   bun run dev
   ```

3. **Test with different users:**
   - Log in as different users (change the JWT cookie)
   - Each user should see their own counter value
   - Changes to one user's counter should not affect other users
   - The former global counter should still sync across all users

## Database Schema

```sql
CREATE TABLE user_counters (
  user_id TEXT PRIMARY KEY,
  value DOUBLE PRECISION NOT NULL DEFAULT 0
);
```

## Future Enhancements

Possible improvements:
- Add a reset button for the former user counter
- Show a list of all users and their counter values (for admins)
- Add statistics (average, min, max across all users)
- Add a leaderboard showing top users by counter value
