-- ============================================================
-- DFACTURAS - PIVOT 04A
-- Compatibilidad segura para la UI original de Facturacion V2
-- Forward-only. Conserva las migraciones 001-003.
-- ============================================================

begin;

alter table public.responsables
  add column if not exists gafete text null;

create unique index if not exists responsables_gafete_unique
  on public.responsables (gafete)
  where gafete is not null;

create or replace function public.compat_create_or_reactivate_ruta(
  p_compania_id uuid,
  p_numero integer
)
returns public.rutas
language plpgsql
security definer
set search_path = public
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
  v_nombre := p_numero::text;

  select * into v_row
  from public.rutas
  where compania_id = p_compania_id and nombre = v_nombre
  limit 1 for update;

  if found then
    if v_row.activo then
      raise exception 'La ruta ya existe y esta activa';
    end if;
    update public.rutas
      set activo = true, updated_at = now()
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

create or replace function public.compat_delete_ruta(p_ruta_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_active_user();
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if exists(select 1 from public.despachos where ruta_id = p_ruta_id) then
    update public.rutas set activo = false, updated_at = now() where id = p_ruta_id;
    if not found then raise exception 'Ruta no encontrada'; end if;
    return 'DEACTIVATED';
  end if;
  delete from public.rutas where id = p_ruta_id;
  if not found then raise exception 'Ruta no encontrada'; end if;
  return 'DELETED';
end;
$$;

create or replace function public.compat_delete_compania(p_compania_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_active_user();
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if exists(select 1 from public.despachos where compania_id = p_compania_id)
     or exists(select 1 from public.rutas where compania_id = p_compania_id) then
    update public.companias set activo = false, updated_at = now() where id = p_compania_id;
    if not found then raise exception 'Compania no encontrada'; end if;
    update public.rutas set activo = false, updated_at = now() where compania_id = p_compania_id;
    return 'DEACTIVATED';
  end if;
  delete from public.companias where id = p_compania_id;
  if not found then raise exception 'Compania no encontrada'; end if;
  return 'DELETED';
end;
$$;

create or replace function public.compat_delete_responsable(p_responsable_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_active_user();
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if exists(select 1 from public.despachos where responsable_id = p_responsable_id) then
    raise exception 'Este responsable posee historial relacionado. Desactivelo para preservar la trazabilidad.';
  end if;
  delete from public.responsables where id = p_responsable_id;
  if not found then raise exception 'Responsable no encontrado'; end if;
  return 'DELETED';
end;
$$;

create or replace function public.compat_create_transportista_with_plate(
  p_nombre_completo text,
  p_placa text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := trim(coalesce(p_nombre_completo, ''));
  v_placa text := upper(trim(coalesce(p_placa, '')));
  v_id uuid;
  v_cliente_retira boolean;
begin
  perform public.require_active_user();
  if v_nombre = '' then raise exception 'Nombre completo requerido' using errcode='22023'; end if;
  if v_placa = '' then raise exception 'Placa requerida' using errcode='22023'; end if;
  v_cliente_retira := upper(v_nombre) = 'CLIENTE RETIRA';

  insert into public.transportistas(nombre, activo, es_cliente_retira)
  values (v_nombre, true, v_cliente_retira)
  returning id into v_id;

  if not v_cliente_retira then
    insert into public.vehiculos(transportista_id, placa, activo)
    values (v_id, v_placa, true);
  end if;
  return v_id;
end;
$$;

create or replace function public.compat_update_transportista_placa(
  p_transportista_id uuid,
  p_vehiculo_id uuid,
  p_nombre_completo text,
  p_placa text,
  p_activo boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := trim(coalesce(p_nombre_completo, ''));
  v_placa text := upper(trim(coalesce(p_placa, '')));
  v_cliente_retira boolean;
  v_vehicle_id uuid;
begin
  perform public.require_active_user();
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
  if v_nombre = '' then raise exception 'Nombre completo requerido' using errcode='22023'; end if;
  v_cliente_retira := upper(v_nombre) = 'CLIENTE RETIRA';

  update public.transportistas
  set nombre = v_nombre,
      activo = coalesce(p_activo, true),
      es_cliente_retira = v_cliente_retira,
      updated_at = now()
  where id = p_transportista_id;
  if not found then raise exception 'Transportista no encontrado'; end if;

  if v_cliente_retira then
    update public.vehiculos set activo = false, updated_at = now()
    where transportista_id = p_transportista_id;
    return;
  end if;

  if v_placa = '' then raise exception 'Placa requerida' using errcode='22023'; end if;

  v_vehicle_id := p_vehiculo_id;
  if v_vehicle_id is null then
    select id into v_vehicle_id from public.vehiculos
    where transportista_id = p_transportista_id
    order by created_at asc limit 1;
  end if;

  if v_vehicle_id is null then
    insert into public.vehiculos(transportista_id, placa, activo)
    values (p_transportista_id, v_placa, coalesce(p_activo, true));
  else
    update public.vehiculos
      set placa = v_placa,
          activo = coalesce(p_activo, true),
          updated_at = now()
      where id = v_vehicle_id and transportista_id = p_transportista_id;
  end if;
end;
$$;

create or replace function public.compat_delete_transportista_placa(
  p_transportista_id uuid,
  p_vehiculo_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_active_user();
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;

  if exists(
    select 1 from public.despachos
    where transportista_id = p_transportista_id
       or (p_vehiculo_id is not null and vehiculo_id = p_vehiculo_id)
  ) then
    update public.transportistas set activo = false, updated_at = now() where id = p_transportista_id;
    update public.vehiculos set activo = false, updated_at = now() where transportista_id = p_transportista_id;
    return 'DEACTIVATED';
  end if;

  delete from public.vehiculos where transportista_id = p_transportista_id;
  delete from public.transportistas where id = p_transportista_id;
  if not found then raise exception 'Transportista no encontrado'; end if;
  return 'DELETED';
end;
$$;

create or replace function public.compat_update_dispatch_detail(
  p_dispatch_id uuid,
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.despachos%rowtype;
begin
  perform public.require_active_user();
  select * into v_row from public.despachos
  where id = p_dispatch_id and deleted_at is null
  for update;
  if not found then raise exception 'Despacho no encontrado'; end if;

  if not public.is_admin()
     and v_row.estado not in ('ATENDIENDO'::public.dispatch_status, 'DESPACHADA'::public.dispatch_status) then
    raise exception 'Permisos insuficientes' using errcode='42501';
  end if;

  update public.despachos
  set detalle = nullif(trim(coalesce(p_detalle, '')), ''),
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
set search_path = public
as $$
declare
  v_old public.despachos%rowtype;
  v_responsable_id uuid;
  v_compania_id uuid;
  v_ruta_id uuid;
  v_transportista_id uuid;
  v_vehiculo_id uuid;
  v_route_company uuid;
  v_cliente_retira boolean := false;
begin
  perform public.require_active_user();
  select * into v_old from public.despachos
  where id = p_dispatch_id and deleted_at is null
  for update;
  if not found then raise exception 'Despacho no encontrado'; end if;

  if not public.is_admin() and v_old.estado = 'DESPACHADA'::public.dispatch_status then
    update public.despachos
    set detalle = nullif(trim(coalesce(p_detalle, '')), ''), updated_at = now()
    where id = p_dispatch_id;
    return;
  end if;

  if not public.is_admin() and v_old.estado <> 'ATENDIENDO'::public.dispatch_status then
    raise exception 'Permisos insuficientes' using errcode='42501';
  end if;

  -- La UI de Facturacion V2 envia el formulario completo.
  -- No usar COALESCE en los campos opcionales: null significa que el
  -- usuario quiere limpiar explicitamente la seleccion anterior.
  v_responsable_id := p_responsable_id;
  v_compania_id := p_compania_id;
  v_ruta_id := p_ruta_id;
  v_transportista_id := p_transportista_id;

  if v_responsable_id is null then raise exception 'Responsable requerido' using errcode='22023'; end if;

  if v_ruta_id is not null then
    if v_compania_id is null then raise exception 'Seleccione una compania para la ruta'; end if;
    select compania_id into v_route_company
    from public.rutas where id = v_ruta_id and activo = true;
    if v_route_company is null then raise exception 'Ruta no encontrada o inactiva'; end if;
    if v_route_company is distinct from v_compania_id then
      raise exception 'La ruta no pertenece a la compania seleccionada';
    end if;
  end if;

  if v_transportista_id is not null then
    select es_cliente_retira into v_cliente_retira
    from public.transportistas
    where id = v_transportista_id and activo = true;
    if not found then raise exception 'Transportista no encontrado o inactivo'; end if;

    if not v_cliente_retira then
      select id into v_vehiculo_id
      from public.vehiculos
      where transportista_id = v_transportista_id and activo = true
      order by created_at asc limit 1;
      if v_vehiculo_id is null then
        raise exception 'El transportista seleccionado no tiene una placa activa asociada';
      end if;
    end if;
  end if;

  update public.despachos
  set responsable_id = v_responsable_id,
      compania_id = v_compania_id,
      ruta_id = v_ruta_id,
      transportista_id = v_transportista_id,
      vehiculo_id = case when v_cliente_retira then null else v_vehiculo_id end,
      detalle = nullif(trim(coalesce(p_detalle, '')), ''),
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
set search_path = public
as $$
declare
  v_row public.despachos%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  perform public.require_active_user();
  select * into v_row from public.despachos
  where id = p_dispatch_id and deleted_at is null
  for update;
  if not found then raise exception 'Despacho no encontrado'; end if;

  if not public.is_admin() and v_row.estado <> 'ATENDIENDO'::public.dispatch_status then
    raise exception 'Permisos insuficientes' using errcode='42501';
  end if;
  if public.is_admin() and v_row.estado <> 'ATENDIENDO'::public.dispatch_status and v_reason = '' then
    raise exception 'Motivo de eliminacion requerido' using errcode='22023';
  end if;

  update public.despachos
  set deleted_at = now(),
      deleted_by = auth.uid(),
      delete_reason = nullif(v_reason, ''),
      updated_at = now()
  where id = p_dispatch_id
  returning * into v_row;
  return v_row;
end;
$$;

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


-- ============================================================
-- DASHBOARD ORIGINAL ADAPTADO AL ESQUEMA DFACTURAS
-- ============================================================
drop function if exists public.admin_dashboard_analytics(
  date,
  date,
  uuid,
  uuid,
  uuid,
  public.dispatch_status
);

drop function if exists public.admin_dashboard_analytics(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
);

create or replace function public.admin_dashboard_analytics(
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
  v_from timestamptz;
  v_to timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Permisos insuficientes'
      using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rango de fechas inválido'
      using errcode = '22023';
  end if;

  v_from := (p_from::timestamp at time zone 'America/Costa_Rica');
  v_to := ((p_to + 1)::timestamp at time zone 'America/Costa_Rica');

  with base as (
    select
      d.*,
      case
        when d.estado = 'PEDIDO_CANCELADO'::public.dispatch_status
          then coalesce(d.fecha_hora_cancelacion, d.created_at)
        else coalesce(d.fecha_hora_inicio, d.created_at)
      end as analytics_at
    from public.despachos d
    where d.deleted_at is null
  ),

  metrics_source as (
    select *
    from base d
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (
        p_ruta_id is null
        or (p_ruta_id = '__NULL__' and d.ruta_id is null)
        or (
          p_ruta_id <> '__NULL__'
          and d.ruta_id::text = p_ruta_id
        )
      )
      and (p_estado is null or d.estado = p_estado)
  ),

  metric_values as (
    select
      count(*)::integer as total,
      count(*) filter (
        where estado = 'DESPACHADA'::public.dispatch_status
      )::integer as despachadas,
      count(*) filter (
        where estado = 'PEDIDO_CANCELADO'::public.dispatch_status
      )::integer as canceladas,
      count(*) filter (
        where estado = 'ATENDIENDO'::public.dispatch_status
      )::integer as pendientes,
      coalesce(
        round(
          avg(
            extract(epoch from (fecha_hora_final - fecha_hora_inicio)) / 60.0
          ) filter (
            where estado = 'DESPACHADA'::public.dispatch_status
              and fecha_hora_inicio is not null
              and fecha_hora_final is not null
              and fecha_hora_final >= fecha_hora_inicio
          )::numeric,
          2
        ),
        0
      )::double precision as promedio_minutos,
      coalesce(
        round(
          max(
            extract(epoch from (fecha_hora_final - fecha_hora_inicio)) / 60.0
          ) filter (
            where estado = 'DESPACHADA'::public.dispatch_status
              and fecha_hora_inicio is not null
              and fecha_hora_final is not null
              and fecha_hora_final >= fecha_hora_inicio
          )::numeric,
          2
        ),
        0
      )::double precision as maximo_minutos
    from metrics_source
  ),

  route_top as (
    select r.nombre as label
    from metrics_source d
    join public.rutas r on r.id = d.ruta_id
    where d.ruta_id is not null
    group by r.id, r.nombre
    order by count(*) desc, r.nombre asc
    limit 1
  ),

  company_values as (
    select
      coalesce(c.id::text, '__NULL__') as id,
      coalesce(c.nombre, 'Sin compañía') as label,
      count(*)::integer as value
    from base d
    left join public.companias c on c.id = d.compania_id
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (
        p_ruta_id is null
        or (p_ruta_id = '__NULL__' and d.ruta_id is null)
        or (
          p_ruta_id <> '__NULL__'
          and d.ruta_id::text = p_ruta_id
        )
      )
      and (p_estado is null or d.estado = p_estado)
    group by c.id, c.nombre
    order by count(*) desc, coalesce(c.nombre, 'Sin compañía')
  ),

  responsible_values as (
    select
      coalesce(r.id::text, '__NULL__') as id,
      coalesce(r.nombre, 'Sin responsable') as label,
      count(*)::integer as value
    from base d
    left join public.responsables r on r.id = d.responsable_id
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_ruta_id is null
        or (p_ruta_id = '__NULL__' and d.ruta_id is null)
        or (
          p_ruta_id <> '__NULL__'
          and d.ruta_id::text = p_ruta_id
        )
      )
      and (p_estado is null or d.estado = p_estado)
    group by r.id, r.nombre
    order by count(*) desc, coalesce(r.nombre, 'Sin responsable')
  ),

  route_values as (
    select
      coalesce(r.id::text, '__NULL__') as id,
      coalesce(r.nombre, 'Sin ruta') as label,
      count(*)::integer as value
    from base d
    left join public.rutas r on r.id = d.ruta_id
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (p_estado is null or d.estado = p_estado)
    group by r.id, r.nombre
    order by count(*) desc, r.nombre nulls last
  ),

  status_values as (
    select
      d.estado::text as id,
      case d.estado
        when 'DESPACHADA'::public.dispatch_status then 'Despachadas'
        when 'ATENDIENDO'::public.dispatch_status then 'Pendientes'
        when 'PEDIDO_CANCELADO'::public.dispatch_status then 'Canceladas'
        else d.estado::text
      end as label,
      count(*)::integer as value
    from base d
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (
        p_ruta_id is null
        or (p_ruta_id = '__NULL__' and d.ruta_id is null)
        or (
          p_ruta_id <> '__NULL__'
          and d.ruta_id::text = p_ruta_id
        )
      )
    group by d.estado
  ),

  month_bounds as (
    select
      (
        date_trunc(
          'month',
          timezone('America/Costa_Rica', now())
        ) - interval '5 months'
      )::date as start_month,
      date_trunc(
        'month',
        timezone('America/Costa_Rica', now())
      )::date as end_month
  ),

  months as (
    select generate_series(
      start_month,
      end_month,
      interval '1 month'
    )::date as month_start
    from month_bounds
  ),

  monthly_values as (
    select
      to_char(m.month_start, 'YYYY-MM') as id,
      case extract(month from m.month_start)::integer
        when 1 then 'Ene'
        when 2 then 'Feb'
        when 3 then 'Mar'
        when 4 then 'Abr'
        when 5 then 'May'
        when 6 then 'Jun'
        when 7 then 'Jul'
        when 8 then 'Ago'
        when 9 then 'Sep'
        when 10 then 'Oct'
        when 11 then 'Nov'
        else 'Dic'
      end as label,
      count(d.id)::integer as value
    from months m
    left join base d
      on d.analytics_at >= (
        m.month_start::timestamp at time zone 'America/Costa_Rica'
      )
      and d.analytics_at < (
        (m.month_start + interval '1 month')::timestamp
        at time zone 'America/Costa_Rica'
      )
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (
        p_ruta_id is null
        or (p_ruta_id = '__NULL__' and d.ruta_id is null)
        or (
          p_ruta_id <> '__NULL__'
          and d.ruta_id::text = p_ruta_id
        )
      )
      and (p_estado is null or d.estado = p_estado)
    group by m.month_start
    order by m.month_start
  ),

  -- Selección: primero las 10 rutas con MAYOR VOLUMEN DESPACHADA.
  -- Cálculo: luego se obtiene su tiempo promedio.
  -- Se ignora p_ruta_id porque esta es la propia dimensión Ruta.
  route_time_ranked as (
    select
      r.id::text as id,
      ('Ruta ' || r.nombre) as label,
      count(d.id)::integer as dispatches,
      round(
        avg(
          extract(epoch from (d.fecha_hora_final - d.fecha_hora_inicio)) / 60.0
        )::numeric,
        1
      )::double precision as value
    from base d
    inner join public.rutas r on r.id = d.ruta_id
    where d.analytics_at >= v_from
      and d.analytics_at < v_to
      and d.ruta_id is not null
      and r.nombre is not null
      and d.estado = 'DESPACHADA'::public.dispatch_status
      and d.fecha_hora_inicio is not null
      and d.fecha_hora_final is not null
      and d.fecha_hora_final >= d.fecha_hora_inicio
      and (
        p_compania_id is null
        or (p_compania_id = '__NULL__' and d.compania_id is null)
        or (
          p_compania_id <> '__NULL__'
          and d.compania_id::text = p_compania_id
        )
      )
      and (
        p_responsable_id is null
        or (p_responsable_id = '__NULL__' and d.responsable_id is null)
        or (
          p_responsable_id <> '__NULL__'
          and d.responsable_id::text = p_responsable_id
        )
      )
      and (
        p_estado is null
        or p_estado = 'DESPACHADA'::public.dispatch_status
      )
    group by r.id, r.nombre
    order by count(d.id) desc, r.nombre asc
    limit 10
  )

  select jsonb_build_object(
    'metrics',
    jsonb_build_object(
      'total', mv.total,
      'despachadas', mv.despachadas,
      'canceladas', mv.canceladas,
      'pendientes', mv.pendientes,
      'promedioMinutos', mv.promedio_minutos,
      'maximoMinutos', mv.maximo_minutos,
      'rutaTop', coalesce((select label from route_top), '-')
    ),
    'companias',
    coalesce(
      (select jsonb_agg(to_jsonb(x)) from company_values x),
      '[]'::jsonb
    ),
    'responsables',
    coalesce(
      (select jsonb_agg(to_jsonb(x)) from responsible_values x),
      '[]'::jsonb
    ),
    'rutas',
    coalesce(
      (select jsonb_agg(to_jsonb(x)) from route_values x),
      '[]'::jsonb
    ),
    'estados',
    coalesce(
      (select jsonb_agg(to_jsonb(x)) from status_values x),
      '[]'::jsonb
    ),
    'comparativaMensual',
    coalesce(
      (
        select jsonb_agg(to_jsonb(x) order by x.id)
        from monthly_values x
      ),
      '[]'::jsonb
    ),
    'promedioRuta',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(x)
          order by x.dispatches desc, x.label
        )
        from route_time_ranked x
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from metric_values mv;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_dashboard_analytics(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) from public;

revoke all on function public.admin_dashboard_analytics(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) from anon;

grant execute on function public.admin_dashboard_analytics(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) to authenticated;

-- Exportación: aplica la misma traducción para que "Exportar Excel"
-- también funcione si el Dashboard está filtrado por "Sin compañía",
-- "Sin responsable" o "Sin ruta".

drop function if exists public.admin_dashboard_export_rows(
  date,
  date,
  uuid,
  uuid,
  uuid,
  public.dispatch_status
);

drop function if exists public.admin_dashboard_export_rows(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
);

create or replace function public.admin_dashboard_export_rows(
  p_from date,
  p_to date,
  p_compania_id text default null,
  p_responsable_id text default null,
  p_ruta_id text default null,
  p_estado public.dispatch_status default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_from timestamptz; v_to timestamptz; v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Permisos insuficientes' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_from>p_to then raise exception 'Rango de fechas inválido' using errcode='22023'; end if;
  v_from := (p_from::timestamp at time zone 'America/Costa_Rica');
  v_to := ((p_to+1)::timestamp at time zone 'America/Costa_Rica');
  select coalesce(jsonb_agg(to_jsonb(x) order by x.analytics_at desc),'[]'::jsonb) into v_result
  from (
    select d.factura,d.estado::text estado,
      coalesce(resp.nombre,'-') responsable,
      coalesce(t.nombre,'-') transportista,
      coalesce(v.placa,'-') placa, coalesce(c.nombre,'-') compania, coalesce(r.nombre,'-') ruta,
      coalesce(d.detalle,'-') detalle,
      coalesce(to_char(timezone('America/Costa_Rica',d.fecha_hora_inicio),'DD/MM/YYYY HH24:MI:SS'),'-') fecha_inicio,
      coalesce(to_char(timezone('America/Costa_Rica',d.fecha_hora_final),'DD/MM/YYYY HH24:MI:SS'),'-') fecha_final,
      coalesce(to_char(timezone('America/Costa_Rica',d.fecha_hora_cancelacion),'DD/MM/YYYY HH24:MI:SS'),'-') fecha_cancelacion,
      case when d.estado='DESPACHADA'::public.dispatch_status and d.fecha_hora_inicio is not null and d.fecha_hora_final is not null
        then round((extract(epoch from(d.fecha_hora_final-d.fecha_hora_inicio))/60.0)::numeric,1)::double precision else null end duracion_minutos,
      case when d.estado='PEDIDO_CANCELADO'::public.dispatch_status then coalesce(d.fecha_hora_cancelacion,d.created_at) else coalesce(d.fecha_hora_inicio,d.created_at) end analytics_at
    from public.despachos d
    left join public.responsables resp on resp.id=d.responsable_id
    left join public.companias c on c.id=d.compania_id
    left join public.rutas r on r.id=d.ruta_id
    left join public.transportistas t on t.id=d.transportista_id
    left join public.vehiculos v on v.id=d.vehiculo_id
    where d.deleted_at is null
      and (case when d.estado='PEDIDO_CANCELADO'::public.dispatch_status then coalesce(d.fecha_hora_cancelacion,d.created_at) else coalesce(d.fecha_hora_inicio,d.created_at) end)>=v_from
      and (case when d.estado='PEDIDO_CANCELADO'::public.dispatch_status then coalesce(d.fecha_hora_cancelacion,d.created_at) else coalesce(d.fecha_hora_inicio,d.created_at) end)<v_to
      and (
        p_compania_id is null
        or (p_compania_id='__NULL__' and d.compania_id is null)
        or (p_compania_id<>'__NULL__' and d.compania_id::text=p_compania_id)
      )
      and (
        p_responsable_id is null
        or (p_responsable_id='__NULL__' and d.responsable_id is null)
        or (p_responsable_id<>'__NULL__' and d.responsable_id::text=p_responsable_id)
      )
      and (
        p_ruta_id is null
        or (p_ruta_id='__NULL__' and d.ruta_id is null)
        or (p_ruta_id<>'__NULL__' and d.ruta_id::text=p_ruta_id)
      )
      and (p_estado is null or d.estado=p_estado)
  ) x;
  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_export_rows(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) from public;

revoke all on function public.admin_dashboard_export_rows(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) from anon;

grant execute on function public.admin_dashboard_export_rows(
  date,
  date,
  text,
  text,
  text,
  public.dispatch_status
) to authenticated;



commit;
