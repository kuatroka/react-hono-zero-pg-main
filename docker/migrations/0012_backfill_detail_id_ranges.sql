ALTER TABLE "serving"."cusip_quarter_investor_activity"
  ADD COLUMN IF NOT EXISTS "min_detail_id" bigint,
  ADD COLUMN IF NOT EXISTS "max_detail_id" bigint;

WITH detail_ranges AS (
  SELECT
    "cusip",
    "quarter",
    MIN("id") AS "min_detail_id",
    MAX("id") AS "max_detail_id"
  FROM "serving"."cusip_quarter_investor_activity_detail"
  GROUP BY "cusip", "quarter"
)
UPDATE "serving"."cusip_quarter_investor_activity" AS activity
SET
  "min_detail_id" = detail_ranges."min_detail_id",
  "max_detail_id" = detail_ranges."max_detail_id"
FROM detail_ranges
WHERE activity."cusip" = detail_ranges."cusip"
  AND activity."quarter" = detail_ranges."quarter";
