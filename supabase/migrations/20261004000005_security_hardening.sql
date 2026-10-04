-- ============================================================
-- DFACTURAS
-- MIGRATION 005 - SECURITY HARDENING
-- Forward-only. Do not modify migrations 001-004.
-- ============================================================

begin;

-- ============================================================
-- 1. SCHEMA / DEFAULT PRIVILEGE HARDENING
-- ============================================================

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

alter default privileges in schema public
  revoke execute on functions from public;

-- ============================================================
-- 2. NEW AUTH USERS START DISABLED
-- ============================================================
-- Public signup must also be disabled in Supabase Auth settings.
-- This trigger is defense-in-depth in case signup is re-enabled.
-- Existing profiles are NOT changed.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_name text;
begin
  v_name := nullif(
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    ''
  );

  if v_name is null then
    v_name := split_part(coalesce(new.email, 'Usuario'), '@', 1);
  end if;

  v_name := left(v_name, 150);

  insert into public.profiles (
    id,
    full_name,
    role,
    active
  )
  values (
    new.id,
    v_name,
    'OPERATIVO'::public.app_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- ============================================================
-- 3. TEXT SIZE INVARIANTS
-- ============================================================

DO $$
begin
  if exists (
    select 1
    from public.despachos
    where detalle is not null
      and char_length(detalle) > 1000
  ) then
    raise exception 'SECURITY_PATCH_BLOCKED: existing detalle exceeds 1000 characters';
  end if;

  if exists (
    select 1
    from public.despachos
    where delete_reason is not null
      and char_length(delete_reason) > 1000
  ) then
    raise exception 'SECURITY_PATCH_BLOCKED: existing delete_reason exceeds 1000 characters';
  end if;
end;
$$;

alter table public.despachos
  drop constraint if exists despachos_detalle_length_check;

alter table public.despachos
  add constraint despachos_detalle_length_check
  check (
    detalle is null
    or char_length(detalle) <= 1000
  );

alter table public.despachos
  drop constraint if exists despachos_delete_reason_length_check;

alter table public.despachos
  add constraint despachos_delete_reason_length_check
  check (
    delete_reason is null
    or char_length(delete_reason) <= 1000
  );

-- ============================================================
-- 4. INTERNAL VALIDATOR FOR DISPATCH CONTEXT
-- ============================================================

create or replace function public.validate_dispatch_context(
  p_responsable_id uuid,
  p_compania_id uuid,
  p_ruta_id uuid,
  p_transportista_id uuid,
  p_vehiculo_id uuid,
  p_require_transportista boolean default false,
  p_require_vehicle_for_normal boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_route_company uuid;
  v_cliente_retira boolean;
begin
  if p_responsable_id is null then
    raise exception 'RESPONSABLE_REQUIRED' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.responsables r
    where r.id = p_responsable_id
      and r.activo = true
  ) then
    raise exception 'RESPONSABLE_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
  end if;

  if p_compania_id is not null
     and not exists (
       select 1
       from public.companias c
       where c.id = p_compania_id
         and c.activo = true
     ) then
    raise exception 'COMPANIA_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
  end if;

  if p_ruta_id is not null then
    if p_compania_id is null then
      raise exception 'RUTA_COMPANIA_REQUIRED' using errcode = '22023';
    end if;

    select r.compania_id
      into v_route_company
    from public.rutas r
    where r.id = p_ruta_id
      and r.activo = true;

    if not found then
      raise exception 'RUTA_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
    end if;

    if v_route_company is distinct from p_compania_id then
      raise exception 'RUTA_COMPANIA_MISMATCH' using errcode = '22023';
    end if;
  end if;

  if p_transportista_id is null then
    if p_require_transportista then
      raise exception 'TRANSPORTISTA_REQUIRED' using errcode = '22023';
    end if;

    if p_vehiculo_id is not null then
      raise exception 'VEHICULO_WITHOUT_TRANSPORTISTA' using errcode = '22023';
    end if;

    return;
  end if;

  select t.es_cliente_retira
    into v_cliente_retira
  from public.transportistas t
  where t.id = p_transportista_id
    and t.activo = true;

  if not found then
    raise exception 'TRANSPORTISTA_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
  end if;

  if v_cliente_retira then
    if p_vehiculo_id is not null then
      raise exception 'CLIENTE_RETIRA_WITH_VEHICLE' using errcode = '22023';
    end if;
    return;
  end if;

  if p_require_vehicle_for_normal and p_vehiculo_id is null then
    raise exception 'VEHICULO_REQUIRED' using errcode = '22023';
  end if;

  if p_vehiculo_id is not null
     and not exists (
       select 1
       from public.vehiculos v
       where v.id = p_vehiculo_id
         and v.transportista_id = p_transportista_id
         and v.activo = true
     ) then
    raise exception 'VEHICULO_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.validate_dispatch_context(
  uuid, uuid, uuid, uuid, uuid, boolean, boolean
) from public;
revoke all on function public.validate_dispatch_context(
  uuid, uuid, uuid, uuid, uuid, boolean, boolean
) from anon;
revoke all on function public.validate_dispatch_context(
  uuid, uuid, uuid, uuid, uuid, boolean, boolean
) from authenticated;

-- ============================================================
-- 5. RLS: HIDE SOFT-DELETED ROWS FROM OPERATIVO
-- ============================================================

DROP POLICY IF EXISTS despachos_select ON public.despachos;

create policy despachos_select
on public.despachos
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and deleted_at is null
  )
);

-- ============================================================
-- 6. FORCE CARRIER/VEHICLE CREATION THROUGH RPC
-- ============================================================

DROP POLICY IF EXISTS transportistas_insert ON public.transportistas;
DROP POLICY IF EXISTS transportistas_admin_update ON public.transportistas;
DROP POLICY IF EXISTS vehiculos_insert ON public.vehiculos;
DROP POLICY IF EXISTS vehiculos_admin_update ON public.vehiculos;

revoke insert, update on table public.transportistas from authenticated;
revoke insert, update on table public.vehiculos from authenticated;

-- ============================================================
-- 7. HARDEN SCAN RPC
-- ============================================================

create or replace function public.scan_dispatch(
  p_factura text,
  p_responsable_id uuid default null,
  p_compania_id uuid default null,
  p_ruta_id uuid default null,
  p_transportista_id uuid default null,
  p_vehiculo_id uuid default null,
  p_detalle text default null
)
returns public.despachos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_factura text;
  v_detalle text;
  v_existing public.despachos%rowtype;
  v_result public.despachos%rowtype;
begin
  perform public.require_active_user();

  v_factura := regexp_replace(
    trim(coalesce(p_factura, '')),
    '\s+',
    '',
    'g'
  );

  v_detalle := nullif(trim(coalesce(p_detalle, '')), '');

  if v_factura !~ '^[0-9]{20}$' then
    raise exception 'INVALID_INVOICE' using errcode = '22023';
  end if;

  if v_detalle is not null and char_length(v_detalle) > 1000 then
    raise exception 'DETAIL_TOO_LONG' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_factura, 0));

  select *
    into v_existing
  from public.despachos
  where factura = v_factura
    and deleted_at is null
  limit 1
  for update;

  if not found then
    perform public.validate_dispatch_context(
      p_responsable_id,
      p_compania_id,
      p_ruta_id,
      p_transportista_id,
      p_vehiculo_id,
      true,
      true
    );

    insert into public.despachos (
      factura,
      estado,
      responsable_id,
      compania_id,
      ruta_id,
      transportista_id,
      vehiculo_id,
      detalle,
      fecha_hora_inicio,
      fecha_hora_final,
      fecha_hora_cancelacion,
      creado_por
    )
    values (
      v_factura,
      'ATENDIENDO'::public.dispatch_status,
      p_responsable_id,
      p_compania_id,
      p_ruta_id,
      p_transportista_id,
      p_vehiculo_id,
      v_detalle,
      now(),
      null,
      null,
      auth.uid()
    )
    returning * into v_result;

    return v_result;
  end if;

  if v_existing.estado = 'ATENDIENDO'::public.dispatch_status then
    update public.despachos
    set estado = 'DESPACHADA'::public.dispatch_status,
        fecha_hora_final = now()
    where id = v_existing.id
      and estado = 'ATENDIENDO'::public.dispatch_status
      and deleted_at is null
    returning * into v_result;

    if not found then
      raise exception 'DISPATCH_STATE_CHANGED';
    end if;

    return v_result;
  end if;

  if v_existing.estado = 'DESPACHADA'::public.dispatch_status then
    raise exception 'ALREADY_DISPATCHED' using errcode = 'P0001';
  end if;

  if v_existing.estado = 'PEDIDO_CANCELADO'::public.dispatch_status then
    raise exception 'DISPATCH_CANCELLED' using errcode = 'P0001';
  end if;

  raise exception 'INVALID_DISPATCH_STATE' using errcode = 'P0001';
end;
$$;

-- ============================================================
-- 8. HARDEN CANCEL RPC
-- ============================================================

create or replace function public.cancel_dispatch(
  p_factura text,
  p_responsable_id uuid,
  p_motivo text,
  p_compania_id uuid default null,
  p_ruta_id uuid default null,
  p_transportista_id uuid default null,
  p_vehiculo_id uuid default null
)
returns public.despachos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_factura text;
  v_motivo text;
  v_existing public.despachos%rowtype;
  v_result public.despachos%rowtype;
  v_compania_id uuid;
  v_ruta_id uuid;
  v_transportista_id uuid;
  v_vehiculo_id uuid;
begin
  perform public.require_active_user();

  v_factura := regexp_replace(
    trim(coalesce(p_factura, '')),
    '\s+',
    '',
    'g'
  );

  v_motivo := trim(coalesce(p_motivo, ''));

  if v_factura !~ '^[0-9]{20}$' then
    raise exception 'INVALID_INVOICE' using errcode = '22023';
  end if;

  if v_motivo = '' then
    raise exception 'CANCEL_REASON_REQUIRED' using errcode = '22023';
  end if;

  if char_length(v_motivo) > 1000 then
    raise exception 'DETAIL_TOO_LONG' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_factura, 0));

  select *
    into v_existing
  from public.despachos
  where factura = v_factura
    and deleted_at is null
  limit 1
  for update;

  if not found then
    perform public.validate_dispatch_context(
      p_responsable_id,
      p_compania_id,
      p_ruta_id,
      p_transportista_id,
      p_vehiculo_id,
      false,
      false
    );

    insert into public.despachos (
      factura,
      estado,
      responsable_id,
      compania_id,
      ruta_id,
      transportista_id,
      vehiculo_id,
      detalle,
      fecha_hora_inicio,
      fecha_hora_final,
      fecha_hora_cancelacion,
      creado_por
    )
    values (
      v_factura,
      'PEDIDO_CANCELADO'::public.dispatch_status,
      p_responsable_id,
      p_compania_id,
      p_ruta_id,
      p_transportista_id,
      p_vehiculo_id,
      v_motivo,
      null,
      null,
      now(),
      auth.uid()
    )
    returning * into v_result;

    return v_result;
  end if;

  if v_existing.estado = 'DESPACHADA'::public.dispatch_status then
    raise exception 'ALREADY_DISPATCHED' using errcode = 'P0001';
  end if;

  if v_existing.estado = 'PEDIDO_CANCELADO'::public.dispatch_status then
    raise exception 'DISPATCH_ALREADY_CANCELLED' using errcode = 'P0001';
  end if;

  if v_existing.estado <> 'ATENDIENDO'::public.dispatch_status then
    raise exception 'INVALID_DISPATCH_STATE' using errcode = 'P0001';
  end if;

  v_compania_id := coalesce(p_compania_id, v_existing.compania_id);
  v_ruta_id := coalesce(p_ruta_id, v_existing.ruta_id);
  v_transportista_id := coalesce(p_transportista_id, v_existing.transportista_id);
  v_vehiculo_id := coalesce(p_vehiculo_id, v_existing.vehiculo_id);

  perform public.validate_dispatch_context(
    p_responsable_id,
    v_compania_id,
    v_ruta_id,
    v_transportista_id,
    v_vehiculo_id,
    false,
    false
  );

  update public.despachos
  set estado = 'PEDIDO_CANCELADO'::public.dispatch_status,
      responsable_id = p_responsable_id,
      compania_id = v_compania_id,
      ruta_id = v_ruta_id,
      transportista_id = v_transportista_id,
      vehiculo_id = v_vehiculo_id,
      detalle = v_motivo,
      fecha_hora_final = null,
      fecha_hora_cancelacion = now()
  where id = v_existing.id
    and estado = 'ATENDIENDO'::public.dispatch_status
    and deleted_at is null
  returning * into v_result;

  if not found then
    raise exception 'DISPATCH_STATE_CHANGED';
  end if;

  return v_result;
end;
$$;

-- ============================================================
-- 9. HARDEN ADMIN DISPATCH RPCS
-- ============================================================

create or replace function public.admin_update_dispatch(
  p_dispatch_id uuid,
  p_responsable_id uuid,
  p_compania_id uuid,
  p_ruta_id uuid,
  p_transportista_id uuid,
  p_vehiculo_id uuid,
  p_detalle text
)
returns public.despachos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.despachos%rowtype;
  v_result public.despachos%rowtype;
  v_detalle text;
begin
  perform public.require_active_user();

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_detalle := nullif(trim(coalesce(p_detalle, '')), '');

  if v_detalle is not null and char_length(v_detalle) > 1000 then
    raise exception 'DETAIL_TOO_LONG' using errcode = '22023';
  end if;

  select *
    into v_existing
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform public.validate_dispatch_context(
    p_responsable_id,
    p_compania_id,
    p_ruta_id,
    p_transportista_id,
    p_vehiculo_id,
    false,
    v_existing.estado <> 'PEDIDO_CANCELADO'::public.dispatch_status
  );

  update public.despachos
  set responsable_id = p_responsable_id,
      compania_id = p_compania_id,
      ruta_id = p_ruta_id,
      transportista_id = p_transportista_id,
      vehiculo_id = p_vehiculo_id,
      detalle = v_detalle
  where id = p_dispatch_id
    and deleted_at is null
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_soft_delete_dispatch(
  p_dispatch_id uuid,
  p_reason text
)
returns public.despachos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason text;
  v_result public.despachos%rowtype;
begin
  perform public.require_active_user();

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_reason := trim(coalesce(p_reason, ''));

  if v_reason = '' then
    raise exception 'DELETE_REASON_REQUIRED' using errcode = '22023';
  end if;

  if char_length(v_reason) > 1000 then
    raise exception 'DELETE_REASON_TOO_LONG' using errcode = '22023';
  end if;

  select *
    into v_result
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.despachos
  set deleted_at = now(),
      deleted_by = auth.uid(),
      delete_reason = v_reason
  where id = p_dispatch_id
    and deleted_at is null
  returning * into v_result;

  if not found then
    raise exception 'DISPATCH_STATE_CHANGED';
  end if;

  return v_result;
end;
$$;

-- ============================================================
-- 10. HARDEN COMPATIBILITY RPCS USED BY ORIGINAL UI
-- ============================================================

create or replace function public.compat_create_or_reactivate_ruta(
  p_compania_id uuid,
  p_numero integer
)
returns public.rutas
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nombre text;
  v_row public.rutas%rowtype;
begin
  perform public.require_active_user();

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_compania_id is null or p_numero is null or p_numero < 0 then
    raise exception 'ROUTE_DATA_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.companias c
    where c.id = p_compania_id
      and c.activo = true
  ) then
    raise exception 'COMPANIA_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
  end if;

  v_nombre := p_numero::text;

  select *
    into v_row
  from public.rutas
  where compania_id = p_compania_id
    and nombre = v_nombre
  limit 1
  for update;

  if found then
    if v_row.activo then
      raise exception 'La ruta ya existe y esta activa';
    end if;

    update public.rutas
    set activo = true,
        updated_at = now()
    where id = v_row.id
    returning * into v_row;

    return v_row;
  end if;

  insert into public.rutas (compania_id, nombre, activo)
  values (p_compania_id, v_nombre, true)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.compat_update_dispatch_detail(
  p_dispatch_id uuid,
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.despachos%rowtype;
  v_detalle text := nullif(trim(coalesce(p_detalle, '')), '');
begin
  perform public.require_active_user();

  if v_detalle is not null and char_length(v_detalle) > 1000 then
    raise exception 'DETAIL_TOO_LONG' using errcode = '22023';
  end if;

  select *
    into v_row
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.is_admin()
     and v_row.estado not in (
       'ATENDIENDO'::public.dispatch_status,
       'DESPACHADA'::public.dispatch_status
     ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  update public.despachos
  set detalle = v_detalle,
      updated_at = now()
  where id = p_dispatch_id;
end;
$$;

create or replace function public.compat_update_dispatch(
  p_dispatch_id uuid,
  p_responsable_id uuid,
  p_compania_id uuid,
  p_ruta_id uuid,
  p_transportista_id uuid,
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old public.despachos%rowtype;
  v_vehiculo_id uuid;
  v_cliente_retira boolean := false;
  v_detalle text := nullif(trim(coalesce(p_detalle, '')), '');
begin
  perform public.require_active_user();

  if v_detalle is not null and char_length(v_detalle) > 1000 then
    raise exception 'DETAIL_TOO_LONG' using errcode = '22023';
  end if;

  select *
    into v_old
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.is_admin()
     and v_old.estado = 'DESPACHADA'::public.dispatch_status then
    update public.despachos
    set detalle = v_detalle,
        updated_at = now()
    where id = p_dispatch_id;
    return;
  end if;

  if not public.is_admin()
     and v_old.estado <> 'ATENDIENDO'::public.dispatch_status then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_transportista_id is not null then
    select t.es_cliente_retira
      into v_cliente_retira
    from public.transportistas t
    where t.id = p_transportista_id
      and t.activo = true;

    if not found then
      raise exception 'TRANSPORTISTA_INACTIVE_OR_NOT_FOUND' using errcode = '22023';
    end if;

    if not v_cliente_retira then
      select v.id
        into v_vehiculo_id
      from public.vehiculos v
      where v.transportista_id = p_transportista_id
        and v.activo = true
      order by v.created_at asc
      limit 1;

      if v_vehiculo_id is null then
        raise exception 'VEHICULO_REQUIRED' using errcode = '22023';
      end if;
    end if;
  end if;

  perform public.validate_dispatch_context(
    p_responsable_id,
    p_compania_id,
    p_ruta_id,
    p_transportista_id,
    case when v_cliente_retira then null else v_vehiculo_id end,
    false,
    p_transportista_id is not null and not v_cliente_retira
  );

  update public.despachos
  set responsable_id = p_responsable_id,
      compania_id = p_compania_id,
      ruta_id = p_ruta_id,
      transportista_id = p_transportista_id,
      vehiculo_id = case when v_cliente_retira then null else v_vehiculo_id end,
      detalle = v_detalle,
      updated_at = now()
  where id = p_dispatch_id;
end;
$$;

create or replace function public.compat_soft_delete_dispatch(
  p_dispatch_id uuid,
  p_reason text default null
)
returns public.despachos
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.despachos%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  perform public.require_active_user();

  select *
    into v_row
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.is_admin()
     and v_row.estado <> 'ATENDIENDO'::public.dispatch_status then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_reason = '' then
    if v_row.estado = 'ATENDIENDO'::public.dispatch_status then
      v_reason := 'Eliminacion operativa de despacho ATENDIENDO';
    else
      raise exception 'DELETE_REASON_REQUIRED' using errcode = '22023';
    end if;
  end if;

  if char_length(v_reason) > 1000 then
    raise exception 'DELETE_REASON_TOO_LONG' using errcode = '22023';
  end if;

  update public.despachos
  set deleted_at = now(),
      deleted_by = auth.uid(),
      delete_reason = v_reason,
      updated_at = now()
  where id = p_dispatch_id
    and deleted_at is null
  returning * into v_row;

  if not found then
    raise exception 'DISPATCH_STATE_CHANGED';
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- 11. HARDEN SEARCH_PATH ON EXISTING SECURITY DEFINER FUNCTIONS
-- ============================================================

alter function public.current_user_role()
  set search_path = pg_catalog, public;
alter function public.is_admin()
  set search_path = pg_catalog, public;
alter function public.is_operativo()
  set search_path = pg_catalog, public;
alter function public.is_active_user()
  set search_path = pg_catalog, public;
alter function public.audit_row_change()
  set search_path = pg_catalog, public;
alter function public.require_active_user()
  set search_path = pg_catalog, public;

alter function public.compat_delete_ruta(uuid)
  set search_path = pg_catalog, public;
alter function public.compat_delete_compania(uuid)
  set search_path = pg_catalog, public;
alter function public.compat_delete_responsable(uuid)
  set search_path = pg_catalog, public;
alter function public.compat_create_transportista_with_plate(text, text)
  set search_path = pg_catalog, public;
alter function public.compat_update_transportista_placa(uuid, uuid, text, text, boolean)
  set search_path = pg_catalog, public;
alter function public.compat_delete_transportista_placa(uuid, uuid)
  set search_path = pg_catalog, public;
alter function public.admin_dashboard_analytics(
  date, date, text, text, text, public.dispatch_status
) set search_path = pg_catalog, public;
alter function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) set search_path = pg_catalog, public;

-- ============================================================
-- 12. EXPLICIT FUNCTION PRIVILEGES
-- ============================================================

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_operativo() from public;
revoke all on function public.is_active_user() from public;
revoke all on function public.require_active_user() from public;

revoke all on function public.scan_dispatch(
  text, uuid, uuid, uuid, uuid, uuid, text
) from public;
revoke all on function public.cancel_dispatch(
  text, uuid, text, uuid, uuid, uuid, uuid
) from public;
revoke all on function public.admin_update_dispatch(
  uuid, uuid, uuid, uuid, uuid, uuid, text
) from public;
revoke all on function public.admin_soft_delete_dispatch(uuid, text) from public;

revoke all on function public.compat_create_or_reactivate_ruta(uuid, integer) from public;
revoke all on function public.compat_delete_ruta(uuid) from public;
revoke all on function public.compat_delete_compania(uuid) from public;
revoke all on function public.compat_delete_responsable(uuid) from public;
revoke all on function public.compat_create_transportista_with_plate(text, text) from public;
revoke all on function public.compat_update_transportista_placa(uuid, uuid, text, text, boolean) from public;
revoke all on function public.compat_delete_transportista_placa(uuid, uuid) from public;
revoke all on function public.compat_update_dispatch_detail(uuid, text) from public;
revoke all on function public.compat_update_dispatch(uuid, uuid, uuid, uuid, uuid, text) from public;
revoke all on function public.compat_soft_delete_dispatch(uuid, text) from public;
revoke all on function public.admin_dashboard_analytics(
  date, date, text, text, text, public.dispatch_status
) from public;
revoke all on function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) from public;

revoke all on function public.current_user_role() from anon;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_operativo() from anon;
revoke all on function public.is_active_user() from anon;
revoke all on function public.require_active_user() from anon;

revoke all on function public.scan_dispatch(
  text, uuid, uuid, uuid, uuid, uuid, text
) from anon;
revoke all on function public.cancel_dispatch(
  text, uuid, text, uuid, uuid, uuid, uuid
) from anon;
revoke all on function public.admin_update_dispatch(
  uuid, uuid, uuid, uuid, uuid, uuid, text
) from anon;
revoke all on function public.admin_soft_delete_dispatch(uuid, text) from anon;

revoke all on function public.compat_create_or_reactivate_ruta(uuid, integer) from anon;
revoke all on function public.compat_delete_ruta(uuid) from anon;
revoke all on function public.compat_delete_compania(uuid) from anon;
revoke all on function public.compat_delete_responsable(uuid) from anon;
revoke all on function public.compat_create_transportista_with_plate(text, text) from anon;
revoke all on function public.compat_update_transportista_placa(uuid, uuid, text, text, boolean) from anon;
revoke all on function public.compat_delete_transportista_placa(uuid, uuid) from anon;
revoke all on function public.compat_update_dispatch_detail(uuid, text) from anon;
revoke all on function public.compat_update_dispatch(uuid, uuid, uuid, uuid, uuid, text) from anon;
revoke all on function public.compat_soft_delete_dispatch(uuid, text) from anon;
revoke all on function public.admin_dashboard_analytics(
  date, date, text, text, text, public.dispatch_status
) from anon;
revoke all on function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) from anon;

-- Restore only the RPCs/helpers required by authenticated application users.
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_operativo() to authenticated;
grant execute on function public.is_active_user() to authenticated;

grant execute on function public.scan_dispatch(
  text, uuid, uuid, uuid, uuid, uuid, text
) to authenticated;
grant execute on function public.cancel_dispatch(
  text, uuid, text, uuid, uuid, uuid, uuid
) to authenticated;
grant execute on function public.admin_update_dispatch(
  uuid, uuid, uuid, uuid, uuid, uuid, text
) to authenticated;
grant execute on function public.admin_soft_delete_dispatch(uuid, text) to authenticated;

grant execute on function public.compat_create_or_reactivate_ruta(uuid, integer) to authenticated;
grant execute on function public.compat_delete_ruta(uuid) to authenticated;
grant execute on function public.compat_delete_compania(uuid) to authenticated;
grant execute on function public.compat_delete_responsable(uuid) to authenticated;
grant execute on function public.compat_create_transportista_with_plate(text, text) to authenticated;
grant execute on function public.compat_update_transportista_placa(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.compat_delete_transportista_placa(uuid, uuid) to authenticated;
grant execute on function public.compat_update_dispatch_detail(uuid, text) to authenticated;
grant execute on function public.compat_update_dispatch(uuid, uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.compat_soft_delete_dispatch(uuid, text) to authenticated;
grant execute on function public.admin_dashboard_analytics(
  date, date, text, text, text, public.dispatch_status
) to authenticated;
grant execute on function public.admin_dashboard_export_rows(
  date, date, text, text, text, public.dispatch_status
) to authenticated;

commit;
