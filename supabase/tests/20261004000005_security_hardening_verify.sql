-- DFACTURAS - read-only verification for migration 005.
-- Run in Supabase SQL Editor after 005 has been applied.
-- The script raises an exception if a required hardening control is missing.

do $$
declare
  v_policy text;
begin
  if has_schema_privilege('authenticated', 'public', 'CREATE')
     or has_schema_privilege('anon', 'public', 'CREATE') then
    raise exception 'VERIFY_FAILED: anon/authenticated can CREATE in public schema';
  end if;

  if position(
    'false' in lower(pg_get_functiondef('public.handle_new_user()'::regprocedure))
  ) = 0 then
    raise exception 'VERIFY_FAILED: handle_new_user does not appear to default profiles inactive';
  end if;

  if has_table_privilege('authenticated', 'public.transportistas', 'INSERT')
     or has_table_privilege('authenticated', 'public.transportistas', 'UPDATE') then
    raise exception 'VERIFY_FAILED: authenticated still has direct write privileges on transportistas';
  end if;

  if has_table_privilege('authenticated', 'public.vehiculos', 'INSERT')
     or has_table_privilege('authenticated', 'public.vehiculos', 'UPDATE') then
    raise exception 'VERIFY_FAILED: authenticated still has direct write privileges on vehiculos';
  end if;

  select qual
    into v_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'despachos'
    and policyname = 'despachos_select';

  if v_policy is null or position('deleted_at' in v_policy) = 0 then
    raise exception 'VERIFY_FAILED: despachos_select does not protect soft-deleted rows';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.despachos'::regclass
      and conname = 'despachos_detalle_length_check'
  ) then
    raise exception 'VERIFY_FAILED: detalle length constraint missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.despachos'::regclass
      and conname = 'despachos_delete_reason_length_check'
  ) then
    raise exception 'VERIFY_FAILED: delete_reason length constraint missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.scan_dispatch(text,uuid,uuid,uuid,uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'VERIFY_FAILED: anon can execute scan_dispatch';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.scan_dispatch(text,uuid,uuid,uuid,uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'VERIFY_FAILED: authenticated cannot execute scan_dispatch';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.validate_dispatch_context(uuid,uuid,uuid,uuid,uuid,boolean,boolean)',
    'EXECUTE'
  ) then
    raise exception 'VERIFY_FAILED: internal validator is executable by authenticated';
  end if;

  if exists (
    select 1 from public.despachos
    where detalle is not null and char_length(detalle) > 1000
  ) then
    raise exception 'VERIFY_FAILED: oversized detalle exists';
  end if;

  if exists (
    select 1 from public.despachos
    where delete_reason is not null and char_length(delete_reason) > 1000
  ) then
    raise exception 'VERIFY_FAILED: oversized delete_reason exists';
  end if;

  raise notice 'DFACTURAS SECURITY 005: verification passed.';
end;
$$;
