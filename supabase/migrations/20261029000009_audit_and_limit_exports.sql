-- ============================================================
-- DFACTURAS
-- MIGRATION 009 - AUDITED, BOUNDED DASHBOARD EXPORTS
-- The Excel export returned every dispatch in any date range and
-- left no trace of who downloaded it. The query moves to an
-- internal function; the public RPC now rejects ranges longer than
-- 366 days and records each export in dashboard_exports before
-- returning the rows. dashboard_exports cannot be changed or
-- deleted, not even with the service role.
-- ============================================================

begin;

create table public.dashboard_exports (
  id uuid primary key default gen_random_uuid(),
  -- Sin clave foránea, como audit_logs.changed_by: el registro se conserva aunque la
  -- cuenta se elimine.
  exported_by uuid,
  exported_at timestamptz not null default now(),
  range_from date not null,
  range_to date not null,
  filters jsonb not null default '{}'::jsonb,
  row_count integer not null check (row_count >= 0)
);

create index dashboard_exports_exported_at_idx
  on public.dashboard_exports (exported_at desc);

alter table public.dashboard_exports enable row level security;

create policy dashboard_exports_admin_select
on public.dashboard_exports
for select
to authenticated
using (public.is_admin());

revoke all on table public.dashboard_exports from public, anon, authenticated;
grant select on table public.dashboard_exports to authenticated;

create or replace function public.dashboard_exports_are_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'DASHBOARD_EXPORTS_IMMUTABLE' using errcode = '42501';
end;
$$;

revoke all on function public.dashboard_exports_are_immutable() from public, anon, authenticated;

create trigger dashboard_exports_immutable
before update or delete on public.dashboard_exports
for each row
execute function public.dashboard_exports_are_immutable();

-- The original query becomes internal: same arguments and output.
alter function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) rename to dashboard_export_rows_query;

revoke all on function public.dashboard_export_rows_query(
  date, date, text, text, text, public.dispatch_status
) from public, anon, authenticated;

create function public.admin_dashboard_export_rows(
  p_from date,
  p_to date,
  p_compania_id text default null,
  p_responsable_id text default null,
  p_ruta_id text default null,
  p_estado public.dispatch_status default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Permisos insuficientes' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;

  if p_to - p_from > 366 then
    raise exception 'EXPORT_RANGE_TOO_LARGE' using errcode = '22023';
  end if;

  v_rows := public.dashboard_export_rows_query(
    p_from, p_to, p_compania_id, p_responsable_id, p_ruta_id, p_estado
  );

  insert into public.dashboard_exports (
    exported_by, range_from, range_to, filters, row_count
  )
  values (
    auth.uid(),
    p_from,
    p_to,
    jsonb_strip_nulls(jsonb_build_object(
      'compania_id', p_compania_id,
      'responsable_id', p_responsable_id,
      'ruta_id', p_ruta_id,
      'estado', p_estado
    )),
    jsonb_array_length(v_rows)
  );

  return v_rows;
end;
$$;

revoke all on function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) from public, anon;
grant execute on function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) to authenticated;

commit;
