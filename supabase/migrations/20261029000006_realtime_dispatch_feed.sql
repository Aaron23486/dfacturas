-- ============================================================
-- DFACTURAS
-- MIGRATION 006 - REALTIME FEED FOR THE DISPATCH HISTORY
-- The dispatch screen subscribes to postgres_changes on
-- public.despachos. Supabase only emits those events for tables
-- in the supabase_realtime publication; RLS still decides which
-- rows each subscriber receives.
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'despachos'
  ) then
    alter publication supabase_realtime add table public.despachos;
  end if;
end;
$$;
