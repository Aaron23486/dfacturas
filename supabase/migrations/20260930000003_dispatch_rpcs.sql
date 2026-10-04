-- ============================================================
-- DFACTURAS
-- MIGRATION 003
-- RPC ATOMICAS DE DESPACHO
-- ============================================================

begin;

-- ============================================================
-- 1. HELPER: EXIGIR USUARIO ACTIVO
-- ============================================================

create or replace function public.require_active_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'USER_INACTIVE'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_active_user() from public;

-- ============================================================
-- 2. SCAN DISPATCH
-- ============================================================
--
-- COMPORTAMIENTO:
--
-- Si factura NO existe:
--   crea ATENDIENDO.
--
-- Si factura esta ATENDIENDO:
--   segundo escaneo -> DESPACHADA.
--
-- Si factura esta DESPACHADA:
--   bloquea.
--
-- Si factura esta PEDIDO_CANCELADO:
--   bloquea.
--
-- La operacion utiliza advisory lock por factura.
-- Esto evita que dos scanners creen/finalicen simultaneamente
-- la misma factura.
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
set search_path = public
as $$
declare
  v_factura text;
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

  if v_factura !~ '^[0-9]{20}$' then
    raise exception 'INVALID_INVOICE'
      using errcode = '22023';
  end if;

  -- Lock transaccional determinista por factura.
  perform pg_advisory_xact_lock(
    hashtextextended(v_factura, 0)
  );

  select *
  into v_existing
  from public.despachos
  where factura = v_factura
    and deleted_at is null
  limit 1
  for update;

  -- ==========================================================
  -- PRIMER ESCANEO
  -- ==========================================================

  if not found then

    if p_responsable_id is null then
      raise exception 'RESPONSABLE_REQUIRED'
        using errcode = '22023';
    end if;

    if p_transportista_id is null then
      raise exception 'TRANSPORTISTA_REQUIRED'
        using errcode = '22023';
    end if;

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

      nullif(trim(coalesce(p_detalle, '')), ''),

      now(),
      null,
      null,

      auth.uid()
    )
    returning *
    into v_result;

    return v_result;
  end if;

  -- ==========================================================
  -- SEGUNDO ESCANEO
  -- ==========================================================

  if v_existing.estado = 'ATENDIENDO' then

    update public.despachos
    set
      estado = 'DESPACHADA'::public.dispatch_status,
      fecha_hora_final = now()
    where id = v_existing.id
      and estado = 'ATENDIENDO'
      and deleted_at is null
    returning *
    into v_result;

    if not found then
      raise exception 'DISPATCH_STATE_CHANGED';
    end if;

    return v_result;
  end if;

  -- ==========================================================
  -- ESTADOS TERMINALES
  -- ==========================================================

  if v_existing.estado = 'DESPACHADA' then
    raise exception 'ALREADY_DISPATCHED'
      using errcode = 'P0001';
  end if;

  if v_existing.estado = 'PEDIDO_CANCELADO' then
    raise exception 'DISPATCH_CANCELLED'
      using errcode = 'P0001';
  end if;

  raise exception 'INVALID_DISPATCH_STATE'
    using errcode = 'P0001';
end;
$$;

-- ============================================================
-- 3. CANCEL DISPATCH
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
set search_path = public
as $$
declare
  v_factura text;
  v_motivo text;
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

  v_motivo := trim(coalesce(p_motivo, ''));

  if v_factura !~ '^[0-9]{20}$' then
    raise exception 'INVALID_INVOICE'
      using errcode = '22023';
  end if;

  if p_responsable_id is null then
    raise exception 'RESPONSABLE_REQUIRED'
      using errcode = '22023';
  end if;

  if v_motivo = '' then
    raise exception 'CANCEL_REASON_REQUIRED'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_factura, 0)
  );

  select *
  into v_existing
  from public.despachos
  where factura = v_factura
    and deleted_at is null
  limit 1
  for update;

  -- No existe: crear directamente cancelada.
  if not found then

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
    returning *
    into v_result;

    return v_result;
  end if;

  if v_existing.estado = 'DESPACHADA' then
    raise exception 'ALREADY_DISPATCHED'
      using errcode = 'P0001';
  end if;

  if v_existing.estado = 'PEDIDO_CANCELADO' then
    raise exception 'DISPATCH_ALREADY_CANCELLED'
      using errcode = 'P0001';
  end if;

  if v_existing.estado <> 'ATENDIENDO' then
    raise exception 'INVALID_DISPATCH_STATE'
      using errcode = 'P0001';
  end if;

  update public.despachos
  set
    estado = 'PEDIDO_CANCELADO'::public.dispatch_status,

    responsable_id = p_responsable_id,

    compania_id = coalesce(
      p_compania_id,
      compania_id
    ),

    ruta_id = coalesce(
      p_ruta_id,
      ruta_id
    ),

    transportista_id = coalesce(
      p_transportista_id,
      transportista_id
    ),

    vehiculo_id = coalesce(
      p_vehiculo_id,
      vehiculo_id
    ),

    detalle = v_motivo,

    fecha_hora_final = null,
    fecha_hora_cancelacion = now()

  where id = v_existing.id
    and estado = 'ATENDIENDO'
    and deleted_at is null

  returning *
  into v_result;

  if not found then
    raise exception 'DISPATCH_STATE_CHANGED';
  end if;

  return v_result;
end;
$$;

-- ============================================================
-- 4. ADMIN UPDATE DISPATCH
-- ============================================================
--
-- Solo permite corregir dimensiones operativas.
--
-- NO permite cambiar:
--   factura
--   estado
--   timestamps
--   creado_por
--   soft-delete
--
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
set search_path = public
as $$
declare
  v_existing public.despachos%rowtype;
  v_result public.despachos%rowtype;
begin
  perform public.require_active_user();

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if p_responsable_id is null then
    raise exception 'RESPONSABLE_REQUIRED'
      using errcode = '22023';
  end if;

  update public.despachos
  set
    responsable_id = p_responsable_id,
    compania_id = p_compania_id,
    ruta_id = p_ruta_id,
    transportista_id = p_transportista_id,
    vehiculo_id = p_vehiculo_id,
    detalle = nullif(trim(coalesce(p_detalle, '')), '')
  where id = p_dispatch_id
    and deleted_at is null
  returning *
  into v_result;

  return v_result;
end;
$$;

-- ============================================================
-- 5. ADMIN SOFT DELETE
-- ============================================================

create or replace function public.admin_soft_delete_dispatch(
  p_dispatch_id uuid,
  p_reason text
)
returns public.despachos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
  v_result public.despachos%rowtype;
begin
  perform public.require_active_user();

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  v_reason := trim(coalesce(p_reason, ''));

  if v_reason = '' then
    raise exception 'DELETE_REASON_REQUIRED'
      using errcode = '22023';
  end if;

  select *
  into v_result
  from public.despachos
  where id = p_dispatch_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  update public.despachos
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    delete_reason = v_reason
  where id = p_dispatch_id
    and deleted_at is null
  returning *
  into v_result;

  if not found then
    raise exception 'DISPATCH_STATE_CHANGED';
  end if;

  return v_result;
end;
$$;

-- ============================================================
-- 6. PRIVILEGIOS
-- ============================================================

revoke all on function public.scan_dispatch(
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public;

revoke all on function public.cancel_dispatch(
  text,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid
) from public;

revoke all on function public.admin_update_dispatch(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public;

revoke all on function public.admin_soft_delete_dispatch(
  uuid,
  text
) from public;

grant execute on function public.scan_dispatch(
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated;

grant execute on function public.cancel_dispatch(
  text,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;

grant execute on function public.admin_update_dispatch(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated;

grant execute on function public.admin_soft_delete_dispatch(
  uuid,
  text
) to authenticated;

commit;
