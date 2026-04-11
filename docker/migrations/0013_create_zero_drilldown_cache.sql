CREATE TABLE IF NOT EXISTS "serving"."asset_investor_activity_drilldown_zero" (
  "id" text NOT NULL,
  "asset_key" text NOT NULL,
  "ticker" text NOT NULL,
  "cusip" text,
  "quarter" text NOT NULL,
  "action" text NOT NULL,
  "cik_name" text NOT NULL,
  "cik" text NOT NULL,
  "cik_ticker" text NOT NULL,
  "detail_id" bigint NOT NULL,
  "hydrated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "asset_investor_activity_drilldown_zero_action_check" CHECK ("action" IN ('open', 'close')),
  CONSTRAINT "asset_investor_activity_drilldown_zero_pkey"
    PRIMARY KEY ("asset_key", "quarter", "action", "cik_name", "cik", "detail_id")
);

CREATE TABLE IF NOT EXISTS "serving"."asset_investor_activity_drilldown_hydration" (
  "asset_key" text PRIMARY KEY NOT NULL,
  "ticker" text NOT NULL,
  "cusip" text,
  "status" text NOT NULL,
  "default_quarter" text,
  "default_action" text,
  "row_count" bigint DEFAULT 0 NOT NULL,
  "hydrated_at" timestamp,
  "error_message" text,
  CONSTRAINT "asset_investor_activity_drilldown_hydration_status_check"
    CHECK ("status" IN ('pending', 'ready', 'error')),
  CONSTRAINT "asset_investor_activity_drilldown_hydration_default_action_check"
    CHECK ("default_action" IS NULL OR "default_action" IN ('open', 'close'))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'asset_investor_activity_drilldown_zero'
  ) THEN
    EXECUTE 'ALTER PUBLICATION zapp_app ADD TABLE serving.asset_investor_activity_drilldown_zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'asset_investor_activity_drilldown_hydration'
  ) THEN
    EXECUTE 'ALTER PUBLICATION zapp_app ADD TABLE serving.asset_investor_activity_drilldown_hydration';
  END IF;
END $$;
