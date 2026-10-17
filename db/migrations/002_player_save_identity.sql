-- Keep identity reads compatible with Neon's managed auth-schema ACL.
-- A SECURITY DEFINER function can cause lazy pg_session_jwt initialization
-- inside a security-restricted context. An owner-privilege view checks schema
-- access without changing the executing user or exposing any account table.
create or replace view public.player_request_identity
with (security_barrier = true)
as select auth.user_id() as user_id;

revoke all on public.player_request_identity from public;
grant select on public.player_request_identity to authenticated;

create or replace function public.current_player_id()
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select user_id from public.player_request_identity
$$;

revoke all on function public.current_player_id() from public;
grant execute on function public.current_player_id() to authenticated;
