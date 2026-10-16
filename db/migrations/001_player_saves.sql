-- Karachi Run: one cloud save per authenticated player.
-- Run this once in the Neon SQL Editor after enabling Neon Auth and the Data API.
-- Install Neon’s JWT claim helpers and the non-login role used by the Data API.
create extension if not exists pg_session_jwt;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

-- Neon protects the auth schema ACL on managed projects. Expose only the
-- current JWT subject through a narrow SECURITY DEFINER helper instead.
create or replace function public.current_player_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.user_id()
$$;

revoke all on function public.current_player_id() from public;
grant execute on function public.current_player_id() to authenticated;

create table if not exists public.player_saves (
  user_id text primary key,
  save_data jsonb not null check (jsonb_typeof(save_data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;
grant usage on schema public to authenticated;
grant select, insert, update on public.player_saves to authenticated;

drop policy if exists "Players read only their own save" on public.player_saves;
create policy "Players read only their own save"
  on public.player_saves for select to authenticated
  using (user_id = (select public.current_player_id()));

drop policy if exists "Players create only their own save" on public.player_saves;
create policy "Players create only their own save"
  on public.player_saves for insert to authenticated
  with check (user_id = (select public.current_player_id()));

drop policy if exists "Players update only their own save" on public.player_saves;
create policy "Players update only their own save"
  on public.player_saves for update to authenticated
  using (user_id = (select public.current_player_id()))
  with check (user_id = (select public.current_player_id()));

create or replace function public.touch_player_save_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_saves_touch_updated_at on public.player_saves;
create trigger player_saves_touch_updated_at
  before update on public.player_saves
  for each row execute function public.touch_player_save_updated_at();
