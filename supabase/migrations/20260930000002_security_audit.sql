-- ============================================================
-- DFACTURAS
-- MIGRATION 002
-- AUTH + AUTORIZACION + RLS + AUDITORIA
-- ============================================================

begin;

-- ============================================================
-- 1. AUDIT LOGS
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  table_name text not null,
  record_id uuid null,

  action text not null
    check (action in ('INSERT', 'UPDATE', 'DELETE')),

  old_data jsonb null,
  new_data jsonb null,

  changed_by uuid null
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index audit_logs_table_record_idx
  on public.audit_logs (table_name, record_id);

create index audit_logs_changed_by_idx
  on public.audit_logs (changed_by);

create index audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

-- ============================================================
-- 2. HELPERS DE AUTORIZACION
-- ============================================================

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'ADMIN'::public.app_role,
    false
  );
$$;

create or replace function public.is_operativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'OPERATIVO'::public.app_role,
    false
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
  );
$$;

-- ============================================================
-- 3. CREACION AUTOMATICA DEL PROFILE
-- ============================================================
--
-- IMPORTANTE:
-- Un usuario nuevo SIEMPRE nace OPERATIVO.
-- Nunca aceptamos role desde user_metadata.
-- La elevacion a ADMIN debe ser una accion administrativa.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- 4. AUDITORIA GENERICA
-- ============================================================

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
begin

  if tg_op = 'INSERT' then
    v_record_id := new.id;

    insert into public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    )
    values (
      tg_table_name,
      v_record_id,
      'INSERT',
      null,
      to_jsonb(new),
      auth.uid()
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_record_id := new.id;

    -- Evita ruido si realmente no cambio nada.
    if to_jsonb(old) = to_jsonb(new) then
      return new;
    end if;

    insert into public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    )
    values (
      tg_table_name,
      v_record_id,
      'UPDATE',
      to_jsonb(old),
      to_jsonb(new),
      auth.uid()
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    v_record_id := old.id;

    insert into public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    )
    values (
      tg_table_name,
      v_record_id,
      'DELETE',
      to_jsonb(old),
      null,
      auth.uid()
    );

    return old;
  end if;

  raise exception 'Operacion de auditoria no soportada: %', tg_op;
end;
$$;

-- ============================================================
-- 5. TRIGGERS DE AUDITORIA
-- ============================================================

create trigger audit_profiles
after insert or update or delete
on public.profiles
for each row
execute function public.audit_row_change();

create trigger audit_responsables
after insert or update or delete
on public.responsables
for each row
execute function public.audit_row_change();

create trigger audit_companias
after insert or update or delete
on public.companias
for each row
execute function public.audit_row_change();

create trigger audit_rutas
after insert or update or delete
on public.rutas
for each row
execute function public.audit_row_change();

create trigger audit_transportistas
after insert or update or delete
on public.transportistas
for each row
execute function public.audit_row_change();

create trigger audit_vehiculos
after insert or update or delete
on public.vehiculos
for each row
execute function public.audit_row_change();

create trigger audit_despachos
after insert or update or delete
on public.despachos
for each row
execute function public.audit_row_change();

-- ============================================================
-- 6. HABILITAR RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.responsables enable row level security;
alter table public.companias enable row level security;
alter table public.rutas enable row level security;
alter table public.transportistas enable row level security;
alter table public.vehiculos enable row level security;
alter table public.despachos enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- 7. PROFILES
-- ============================================================
--
-- Usuario:
--   puede leer su propio perfil.
--
-- ADMIN:
--   puede leer todos.
--   puede modificar perfiles.
--
-- No damos INSERT/DELETE directo desde frontend.
-- ============================================================

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 8. RESPONSABLES
-- ============================================================

create policy responsables_select
on public.responsables
for select
to authenticated
using (
  public.is_active_user()
);

create policy responsables_admin_insert
on public.responsables
for insert
to authenticated
with check (
  public.is_admin()
);

create policy responsables_admin_update
on public.responsables
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 9. COMPANIAS
-- ============================================================

create policy companias_select
on public.companias
for select
to authenticated
using (
  public.is_active_user()
);

create policy companias_admin_insert
on public.companias
for insert
to authenticated
with check (
  public.is_admin()
);

create policy companias_admin_update
on public.companias
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 10. RUTAS
-- ============================================================

create policy rutas_select
on public.rutas
for select
to authenticated
using (
  public.is_active_user()
);

create policy rutas_admin_insert
on public.rutas
for insert
to authenticated
with check (
  public.is_admin()
);

create policy rutas_admin_update
on public.rutas
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 11. TRANSPORTISTAS
-- ============================================================
--
-- Requisito del dominio:
-- OPERATIVO puede crear transportistas.
-- Eso NO le concede UPDATE/DELETE.
-- ============================================================

create policy transportistas_select
on public.transportistas
for select
to authenticated
using (
  public.is_active_user()
);

create policy transportistas_insert
on public.transportistas
for insert
to authenticated
with check (
  public.is_active_user()
);

create policy transportistas_admin_update
on public.transportistas
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 12. VEHICULOS
-- ============================================================
--
-- OPERATIVO puede registrar placas/vehiculos.
-- UPDATE queda reservado a ADMIN.
-- ============================================================

create policy vehiculos_select
on public.vehiculos
for select
to authenticated
using (
  public.is_active_user()
);

create policy vehiculos_insert
on public.vehiculos
for insert
to authenticated
with check (
  public.is_active_user()
);

create policy vehiculos_admin_update
on public.vehiculos
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- ============================================================
-- 13. DESPACHOS
-- ============================================================
--
-- Lectura:
--   cualquier usuario activo.
--
-- Escrituras:
--   NO se conceden aqui.
--
-- El flujo normal se realizara exclusivamente mediante RPC
-- SECURITY DEFINER en migration 003.
--
-- Esto evita permitir UPDATE arbitrario sobre estado,
-- timestamps, responsables, etc.
-- ============================================================

create policy despachos_select
on public.despachos
for select
to authenticated
using (
  public.is_active_user()
);

-- ============================================================
-- 14. AUDIT LOGS
-- ============================================================
--
-- Solo ADMIN puede consultar auditoria.
-- Nadie modifica audit_logs directamente desde frontend.
-- ============================================================

create policy audit_logs_admin_select
on public.audit_logs
for select
to authenticated
using (
  public.is_admin()
);

-- ============================================================
-- 15. PRIVILEGIOS BASE
-- ============================================================

revoke all on table public.profiles from anon;
revoke all on table public.responsables from anon;
revoke all on table public.companias from anon;
revoke all on table public.rutas from anon;
revoke all on table public.transportistas from anon;
revoke all on table public.vehiculos from anon;
revoke all on table public.despachos from anon;
revoke all on table public.audit_logs from anon;

grant select on table public.profiles to authenticated;
grant select on table public.responsables to authenticated;
grant select on table public.companias to authenticated;
grant select on table public.rutas to authenticated;
grant select on table public.transportistas to authenticated;
grant select on table public.vehiculos to authenticated;
grant select on table public.despachos to authenticated;

grant update on table public.profiles to authenticated;

grant insert, update on table public.responsables to authenticated;
grant insert, update on table public.companias to authenticated;
grant insert, update on table public.rutas to authenticated;

grant insert, update on table public.transportistas to authenticated;
grant insert, update on table public.vehiculos to authenticated;

grant select on table public.audit_logs to authenticated;

-- ============================================================
-- 16. PROTEGER FUNCIONES
-- ============================================================

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_operativo() from public;
revoke all on function public.is_active_user() from public;

grant execute on function public.current_user_role()
to authenticated;

grant execute on function public.is_admin()
to authenticated;

grant execute on function public.is_operativo()
to authenticated;

grant execute on function public.is_active_user()
to authenticated;

-- Funciones internas: frontend NO debe invocarlas.

revoke all on function public.handle_new_user() from public;
revoke all on function public.audit_row_change() from public;

commit;
