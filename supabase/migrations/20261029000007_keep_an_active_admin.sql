-- ============================================================
-- DFACTURAS
-- MIGRATION 007 - KEEP AT LEAST ONE ACTIVE ADMIN
-- profiles can be changed by an ADMIN session (RLS policy
-- profiles_admin_update) and by the terminal account commands
-- (service role). Either path could deactivate or demote the
-- last active ADMIN and leave nobody able to administer the
-- system. This trigger rejects that change in both paths.
-- ============================================================

begin;

create or replace function public.keep_an_active_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.role = 'ADMIN'::public.app_role
     and old.active
     and (
       tg_op = 'DELETE'
       or new.role <> 'ADMIN'::public.app_role
       or not new.active
     ) then
    -- Serializes concurrent changes to admin accounts.
    perform pg_advisory_xact_lock(hashtextextended('dfacturas.active_admins', 0));

    if not exists (
      select 1
      from public.profiles p
      where p.role = 'ADMIN'::public.app_role
        and p.active
        and p.id <> old.id
    ) then
      raise exception 'LAST_ADMIN_REQUIRED' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.keep_an_active_admin() from public;
revoke all on function public.keep_an_active_admin() from anon;
revoke all on function public.keep_an_active_admin() from authenticated;

drop trigger if exists profiles_keep_an_active_admin on public.profiles;

create trigger profiles_keep_an_active_admin
before update of role, active or delete
on public.profiles
for each row
execute function public.keep_an_active_admin();

commit;
