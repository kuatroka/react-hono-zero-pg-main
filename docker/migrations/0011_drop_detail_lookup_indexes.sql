ALTER PUBLICATION zapp_app SET TABLE
  public."user",
  public.medium,
  public.message,
  serving.counters,
  serving.value_quarters,
  serving.entities,
  serving.searches,
  serving.assets,
  serving.superinvestors,
  serving.cusip_quarter_investor_activity,
  app_state.user_counters;

DROP INDEX IF EXISTS "serving"."idx_cqia_detail_open_lookup";
DROP INDEX IF EXISTS "serving"."idx_cqia_detail_close_lookup";
