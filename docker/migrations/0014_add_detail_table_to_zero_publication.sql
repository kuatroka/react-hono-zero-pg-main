DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'zapp_app'
      AND schemaname = 'serving'
      AND tablename = 'cusip_quarter_investor_activity_detail'
  ) THEN
    EXECUTE 'ALTER PUBLICATION zapp_app ADD TABLE serving.cusip_quarter_investor_activity_detail';
  END IF;
END $$;
