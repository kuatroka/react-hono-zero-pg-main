CREATE INDEX IF NOT EXISTS "idx_cqia_detail_open_lookup"
  ON "serving"."cusip_quarter_investor_activity_detail" USING btree ("ticker","quarter","cusip","id")
  WHERE "did_open" = true;

CREATE INDEX IF NOT EXISTS "idx_cqia_detail_close_lookup"
  ON "serving"."cusip_quarter_investor_activity_detail" USING btree ("ticker","quarter","cusip","id")
  WHERE "did_close" = true;
