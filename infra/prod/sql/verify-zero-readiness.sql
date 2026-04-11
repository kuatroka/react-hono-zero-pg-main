DO $$
BEGIN
  IF current_setting('wal_level') <> 'logical' THEN
    RAISE EXCEPTION 'wal_level must be logical for Zero, got %', current_setting('wal_level');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_duckdb') THEN
    RAISE EXCEPTION 'pg_duckdb extension is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_mooncake') THEN
    RAISE EXCEPTION 'pg_mooncake extension is missing';
  END IF;

  IF to_regclass('public.user') IS NULL THEN
    RAISE EXCEPTION 'public.user is missing';
  END IF;

  IF to_regclass('public.medium') IS NULL THEN
    RAISE EXCEPTION 'public.medium is missing';
  END IF;

  IF to_regclass('public.message') IS NULL THEN
    RAISE EXCEPTION 'public.message is missing';
  END IF;

  IF to_regclass('serving.assets') IS NULL THEN
    RAISE EXCEPTION 'serving.assets is missing';
  END IF;

  IF to_regclass('serving.superinvestors') IS NULL THEN
    RAISE EXCEPTION 'serving.superinvestors is missing';
  END IF;

  IF to_regclass('serving.cusip_quarter_investor_activity') IS NULL THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.cusip_quarter_investor_activity'::regclass
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity must have a primary key for Zero sync';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'serving'
      AND tablename = 'cusip_quarter_investor_activity'
      AND indexname = 'idx_cusip_quarter_activity_cusip_quarter'
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_cusip_quarter for Zero chart lookups';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'serving'
      AND tablename = 'cusip_quarter_investor_activity'
      AND indexname = 'idx_cusip_quarter_activity_ticker_quarter'
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_ticker_quarter for Zero chart lookups';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'serving'
      AND table_name = 'cusip_quarter_investor_activity'
      AND column_name = 'min_detail_id'
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity must expose min_detail_id for drilldown id-range lookups';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'serving'
      AND table_name = 'cusip_quarter_investor_activity'
      AND column_name = 'max_detail_id'
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity must expose max_detail_id for drilldown id-range lookups';
  END IF;

  IF to_regclass('serving.cusip_quarter_investor_activity_detail') IS NULL THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity_detail is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.cusip_quarter_investor_activity_detail'::regclass
  ) THEN
    RAISE EXCEPTION 'serving.cusip_quarter_investor_activity_detail must have a primary key for Zero sync';
  END IF;

  IF to_regclass('serving.asset_investor_activity_drilldown_zero') IS NULL THEN
    RAISE EXCEPTION 'serving.asset_investor_activity_drilldown_zero is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.asset_investor_activity_drilldown_zero'::regclass
  ) THEN
    RAISE EXCEPTION 'serving.asset_investor_activity_drilldown_zero must have a primary key for Zero sync';
  END IF;

  IF to_regclass('serving.asset_investor_activity_drilldown_hydration') IS NULL THEN
    RAISE EXCEPTION 'serving.asset_investor_activity_drilldown_hydration is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.asset_investor_activity_drilldown_hydration'::regclass
  ) THEN
    RAISE EXCEPTION 'serving.asset_investor_activity_drilldown_hydration must have a primary key for Zero sync';
  END IF;

  IF to_regclass('app_state.user_counters') IS NULL THEN
    RAISE EXCEPTION 'app_state.user_counters is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'zapp_app') THEN
    RAISE EXCEPTION 'publication zapp_app is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'assets'
  ) THEN
    RAISE EXCEPTION 'publication zapp_app is missing serving.assets';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'cusip_quarter_investor_activity'
  ) THEN
    RAISE EXCEPTION 'publication zapp_app is missing serving.cusip_quarter_investor_activity';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'cusip_quarter_investor_activity_detail'
  ) THEN
    RAISE EXCEPTION 'publication zapp_app is missing serving.cusip_quarter_investor_activity_detail';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'asset_investor_activity_drilldown_zero'
  ) THEN
    RAISE EXCEPTION 'publication zapp_app is missing serving.asset_investor_activity_drilldown_zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'asset_investor_activity_drilldown_hydration'
  ) THEN
    RAISE EXCEPTION 'publication zapp_app is missing serving.asset_investor_activity_drilldown_hydration';
  END IF;

END $$;

SELECT current_setting('wal_level') AS wal_level;
SELECT extname
FROM pg_extension
WHERE extname IN ('pg_duckdb', 'pg_mooncake')
ORDER BY extname;

SELECT pubname
FROM pg_publication
WHERE pubname = 'zapp_app';
