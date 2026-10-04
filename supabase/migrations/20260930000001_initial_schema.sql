-- ============================================================
-- DFACTURAS
-- BASELINE 001 - MODELO RELACIONAL
-- ============================================================
--
-- IMPORTANTE:
--   * Proyecto independiente de Facturacion V2.
--   * No contiene datos reales.
--   * No contiene secretos.
--   * RLS/RPC/GRANTS se incorporaran en una migracion posterior.
--
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

create type public.app_role as enum (
  'ADMIN',
  'OPERATIVO'
);

create type public.dispatch_status as enum (
  'ATENDIENDO',
  'DESPACHADA',
  'PEDIDO_CANCELADO'
);

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null
    check (char_length(trim(full_name)) between 1 and 150),

  role public.app_role not null default 'OPERATIVO',

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RESPONSABLES
-- ============================================================

create table public.responsables (
  id uuid primary key default gen_random_uuid(),

  nombre text not null
    check (char_length(trim(nombre)) between 1 and 150),

  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint responsables_nombre_unique unique (nombre)
);

-- ============================================================
-- COMPANIAS
-- ============================================================

create table public.companias (
  id uuid primary key default gen_random_uuid(),

  nombre text not null
    check (char_length(trim(nombre)) between 1 and 150),

  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companias_nombre_unique unique (nombre)
);

-- ============================================================
-- RUTAS
-- ============================================================

create table public.rutas (
  id uuid primary key default gen_random_uuid(),

  compania_id uuid not null
    references public.companias(id)
    on delete restrict,

  nombre text not null
    check (char_length(trim(nombre)) between 1 and 150),

  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rutas_compania_nombre_unique
    unique (compania_id, nombre),

  constraint rutas_id_compania_unique
    unique (id, compania_id)
);

-- ============================================================
-- TRANSPORTISTAS
-- ============================================================

create table public.transportistas (
  id uuid primary key default gen_random_uuid(),

  nombre text not null
    check (char_length(trim(nombre)) between 1 and 150),

  activo boolean not null default true,

  -- Permite identificar CLIENTE RETIRA sin depender del texto.
  es_cliente_retira boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transportistas_nombre_unique unique (nombre)
);

-- Solo puede existir un transportista especial CLIENTE RETIRA.

create unique index transportistas_cliente_retira_unique
  on public.transportistas (es_cliente_retira)
  where es_cliente_retira = true;

-- ============================================================
-- VEHICULOS
-- ============================================================

create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),

  transportista_id uuid not null
    references public.transportistas(id)
    on delete restrict,

  placa text not null
    check (char_length(trim(placa)) between 1 and 30),

  activo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehiculos_placa_unique unique (placa),

  constraint vehiculos_id_transportista_unique
    unique (id, transportista_id)
);

-- ============================================================
-- DESPACHOS
-- ============================================================

create table public.despachos (
  id uuid primary key default gen_random_uuid(),

  factura text not null,

  estado public.dispatch_status not null,

  responsable_id uuid not null
    references public.responsables(id)
    on delete restrict,

  compania_id uuid null
    references public.companias(id)
    on delete restrict,

  ruta_id uuid null,

  transportista_id uuid null
    references public.transportistas(id)
    on delete restrict,

  vehiculo_id uuid null,

  detalle text null,

  fecha_hora_inicio timestamptz null,
  fecha_hora_final timestamptz null,
  fecha_hora_cancelacion timestamptz null,

  creado_por uuid null
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  deleted_at timestamptz null,
  deleted_by uuid null
    references auth.users(id)
    on delete set null,

  delete_reason text null,

  -- ----------------------------------------------------------
  -- FACTURA
  -- ----------------------------------------------------------

  constraint despachos_factura_format_check
    check (factura ~ '^[0-9]{20}$'),

  -- Una ruta no puede existir sin compania.
  constraint despachos_ruta_requires_compania_check
    check (
      ruta_id is null
      or compania_id is not null
    ),

  -- Un vehiculo no puede existir sin transportista.
  constraint despachos_vehicle_requires_carrier_check
    check (
      vehiculo_id is null
      or transportista_id is not null
    ),

  -- ----------------------------------------------------------
  -- RELACIONES COMPUESTAS
  -- ----------------------------------------------------------

  constraint despachos_ruta_compania_fk
    foreign key (ruta_id, compania_id)
    references public.rutas(id, compania_id)
    on delete restrict,

  constraint despachos_vehiculo_transportista_fk
    foreign key (vehiculo_id, transportista_id)
    references public.vehiculos(id, transportista_id)
    on delete restrict,

  -- ----------------------------------------------------------
  -- ESTADOS
  -- ----------------------------------------------------------

  constraint despachos_state_dates_check
    check (
      (
        estado = 'ATENDIENDO'
        and fecha_hora_inicio is not null
        and fecha_hora_final is null
        and fecha_hora_cancelacion is null
      )
      or
      (
        estado = 'DESPACHADA'
        and fecha_hora_inicio is not null
        and fecha_hora_final is not null
        and fecha_hora_cancelacion is null
      )
      or
      (
        estado = 'PEDIDO_CANCELADO'
        and fecha_hora_final is null
        and fecha_hora_cancelacion is not null
      )
    ),

  -- Cancelacion requiere motivo.
  constraint despachos_cancel_reason_check
    check (
      estado <> 'PEDIDO_CANCELADO'
      or char_length(trim(coalesce(detalle, ''))) > 0
    ),

  -- ----------------------------------------------------------
  -- SOFT DELETE
  -- ----------------------------------------------------------

  constraint despachos_soft_delete_metadata_check
    check (
      (
        deleted_at is null
        and deleted_by is null
        and delete_reason is null
      )
      or
      (
        deleted_at is not null
        and deleted_by is not null
        and char_length(trim(coalesce(delete_reason, ''))) > 0
      )
    )
);

-- ============================================================
-- FACTURA ACTIVA UNICA
-- ============================================================
--
-- Una factura eliminada logicamente puede conservarse como
-- historico sin impedir una futura decision administrativa.
-- La regla normal impide duplicados entre registros activos.
-- ============================================================

create unique index despachos_factura_active_unique
  on public.despachos (factura)
  where deleted_at is null;

-- ============================================================
-- INDICES
-- ============================================================

create index despachos_estado_idx
  on public.despachos (estado)
  where deleted_at is null;

create index despachos_responsable_idx
  on public.despachos (responsable_id)
  where deleted_at is null;

create index despachos_compania_idx
  on public.despachos (compania_id)
  where deleted_at is null;

create index despachos_transportista_idx
  on public.despachos (transportista_id)
  where deleted_at is null;

create index despachos_created_at_idx
  on public.despachos (created_at desc)
  where deleted_at is null;

create index despachos_fecha_final_idx
  on public.despachos (fecha_hora_final desc)
  where deleted_at is null
    and estado = 'DESPACHADA';

create index rutas_compania_idx
  on public.rutas (compania_id);

create index vehiculos_transportista_idx
  on public.vehiculos (transportista_id);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger responsables_set_updated_at
before update on public.responsables
for each row
execute function public.set_updated_at();

create trigger companias_set_updated_at
before update on public.companias
for each row
execute function public.set_updated_at();

create trigger rutas_set_updated_at
before update on public.rutas
for each row
execute function public.set_updated_at();

create trigger transportistas_set_updated_at
before update on public.transportistas
for each row
execute function public.set_updated_at();

create trigger vehiculos_set_updated_at
before update on public.vehiculos
for each row
execute function public.set_updated_at();

create trigger despachos_set_updated_at
before update on public.despachos
for each row
execute function public.set_updated_at();

-- ============================================================
-- VALIDACION CLIENTE RETIRA
-- ============================================================

create or replace function public.validate_dispatch_transport()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cliente_retira boolean;
begin

  if new.transportista_id is null then

    if new.vehiculo_id is not null then
      raise exception
        'No puede existir vehiculo sin transportista';
    end if;

    return new;
  end if;

  select es_cliente_retira
    into v_cliente_retira
  from public.transportistas
  where id = new.transportista_id;

  if not found then
    raise exception 'Transportista inexistente';
  end if;

  if v_cliente_retira then

    if new.vehiculo_id is not null then
      raise exception
        'CLIENTE RETIRA no puede tener vehiculo';
    end if;

    return new;
  end if;

  -- Cancelaciones permiten contexto parcial.
  if new.estado = 'PEDIDO_CANCELADO' then
    return new;
  end if;

  -- Flujo normal:
  -- transportista normal requiere vehiculo.
  if new.vehiculo_id is null then
    raise exception
      'El transportista seleccionado requiere vehiculo';
  end if;

  return new;
end;
$$;

create trigger despachos_validate_transport
before insert or update of
  estado,
  transportista_id,
  vehiculo_id
on public.despachos
for each row
execute function public.validate_dispatch_transport();

-- ============================================================
-- VALIDAR QUE CLIENTE RETIRA NO TENGA VEHICULOS
-- ============================================================

create or replace function public.validate_vehicle_special_carrier()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cliente_retira boolean;
begin

  select es_cliente_retira
    into v_cliente_retira
  from public.transportistas
  where id = new.transportista_id;

  if not found then
    raise exception 'Transportista inexistente';
  end if;

  if v_cliente_retira then
    raise exception
      'CLIENTE RETIRA no puede tener vehiculos asociados';
  end if;

  return new;
end;
$$;

create trigger vehiculos_validate_special_carrier
before insert or update of transportista_id
on public.vehiculos
for each row
execute function public.validate_vehicle_special_carrier();

commit;
