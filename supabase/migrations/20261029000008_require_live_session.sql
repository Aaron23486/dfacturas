-- ============================================================
-- DFACTURAS
-- MIGRATION 008 - REQUIRE A LIVE AUTH SESSION
-- PostgREST and Realtime accept a JWT until it expires (60 min),
-- even after the user signs out. The authorization helpers now
-- also require the token's session to still exist in Auth, so
-- signing out (or a session timeout) cuts database access at once.
-- is_admin(), is_operativo(), require_active_user() and every RLS
-- policy build on these two helpers.
-- ============================================================

begin;

create or replace function public.has_live_session()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_live_session()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active = true
    );
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
    and public.has_live_session()
  limit 1;
$$;

revoke all on function public.has_live_session() from public;
revoke all on function public.has_live_session() from anon;
grant execute on function public.has_live_session() to authenticated;

commit;
