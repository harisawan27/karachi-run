-- Phase 3: atomic per-player saves and idempotent progression rewards.
-- SECURITY INVOKER keeps the existing authenticated-player RLS boundary.
create table if not exists public.player_reward_claims (
 user_id text not null references public.player_saves(user_id),
 reward_key text not null,
 reward jsonb not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,reward_key)
);
alter table public.player_reward_claims enable row level security;
grant select,insert on public.player_reward_claims to authenticated;
drop policy if exists "Read own reward receipts" on public.player_reward_claims;
create policy "Read own reward receipts" on public.player_reward_claims for select to authenticated using(user_id=(select public.current_player_id()));
drop policy if exists "Create own reward receipts" on public.player_reward_claims;
create policy "Create own reward receipts" on public.player_reward_claims for insert to authenticated with check(user_id=(select public.current_player_id()));

create or replace function public.keep_legacy_player_progression() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 if coalesce((new.save_data->>'version')::int,0)<8 and old.save_data ? 'progression' then
  new.save_data=jsonb_set(new.save_data,'{progression}',old.save_data->'progression');
 end if;
 return new;
end $$;
drop trigger if exists preserve_legacy_progression on public.player_saves;
create trigger preserve_legacy_progression before update on public.player_saves for each row execute function public.keep_legacy_player_progression();

create or replace function public.sync_player_save(p_expected_updated_at timestamptz,p_save jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare uid text:=public.current_player_id(); r public.player_saves%rowtype;
begin
 if uid is null then raise exception 'Sign in to save progress' using errcode='28000'; end if;
 if jsonb_typeof(p_save)<>'object' or pg_column_size(p_save)>131072 then raise exception 'Invalid save snapshot' using errcode='22023'; end if;
 select * into r from public.player_saves where user_id=uid for update;
 if found then
  if r.updated_at is distinct from p_expected_updated_at then raise exception 'Another device updated this save. Load the latest cloud save before continuing.' using errcode='40001'; end if;
  update public.player_saves set save_data=p_save where user_id=uid returning * into r;
 else
  if p_expected_updated_at is not null then raise exception 'Cloud save changed. Reload it.' using errcode='40001'; end if;
  insert into public.player_saves(user_id,save_data) values(uid,p_save) returning * into r;
 end if;
 return jsonb_build_object('user_id',uid,'save_data',r.save_data,'updated_at',r.updated_at);
exception when unique_violation then raise exception 'Another device created this save. Reload it.' using errcode='40001';
end $$;

create or replace function public.claim_player_reward(p_kind text,p_key text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare uid text:=public.current_player_id(); r public.player_saves%rowtype; s jsonb; p jsonb; receipt jsonb;
 today text:=to_char(statement_timestamp() at time zone 'Asia/Karachi','YYYY-MM-DD');
 set_number int; scale numeric; targets int[]; j int; coins int:=0; boards int:=0; tickets int:=0; pick int:=0; reward_name text; next_set int;
begin
 if uid is null then raise exception 'Sign in to collect rewards' using errcode='28000'; end if;
 select * into r from public.player_saves where user_id=uid for update;
 if not found then raise exception 'Sync your progress before claiming a reward' using errcode='22023'; end if;
 s:=r.save_data; p:=s->'progression';
 select reward into receipt from public.player_reward_claims where user_id=uid and reward_key=p_key;
 if found then return jsonb_build_object('user_id',uid,'save_data',s,'updated_at',r.updated_at,'already_claimed',true,'reward',receipt); end if;
 if p_kind='mission' then
  set_number:=coalesce((p->>'set')::int,0);
  if set_number<0 or set_number>=9999 or p_key<>'mission:'||set_number::text then raise exception 'Mission set changed. Refresh your progress.' using errcode='22023'; end if;
  scale:=1+least(3,floor(set_number/4.0)*.35);
  targets:=case set_number%4 when 0 then array[80,700,4] when 1 then array[6,150,10] when 2 then array[3,1400,25] else array[10,10,240] end;
  for j in 0..2 loop
   if coalesce((p->'counts'->>j)::numeric,0)<round(targets[j+1]*scale) then raise exception 'Complete all three missions first' using errcode='22023'; end if;
  end loop;
  coins:=least(400,120+set_number*10); next_set:=set_number+1;
  p:=jsonb_set(jsonb_set(p,'{set}',to_jsonb(next_set)),'{counts}','[0,0,0]');
  s:=jsonb_set(jsonb_set(s,'{missionIndex}',to_jsonb(greatest(coalesce((s->>'missionIndex')::int,0),next_set*3))),'{missionProgress}','0');
  reward_name:=case when set_number<29 then 'Multiplier level up!' else 'Mission set complete!' end;
 elsif p_kind='daily' then
  if p_key<>'daily:'||today or p->'daily'->>'day'<>today then raise exception 'The daily hunt has reset at midnight Pakistan time. Refresh it.' using errcode='22023'; end if;
  if coalesce((p->'daily'->>'claimed')::boolean,false) then return jsonb_build_object('user_id',uid,'save_data',s,'updated_at',r.updated_at,'already_claimed',true,'reward',jsonb_build_object('coins',0,'boards',0,'tickets',0,'name','Already collected')); end if;
  if coalesce((p->'daily'->>'mask')::int,0)<>127 then raise exception 'Collect all seven KARACHI letters first' using errcode='22023'; end if;
  for j in 1..length(today||uid) loop pick:=(pick+ascii(substr(today||uid,j,1)))%3; end loop;
  if pick=0 then coins:=500;boards:=2;reward_name:='Street Cruiser Pack';
  elsif pick=1 then coins:=350;tickets:=2;reward_name:='Wapsi Pack';
  else coins:=800;boards:=1;reward_name:='Karachi Gold Pack'; end if;
  p:=jsonb_set(p,'{daily,claimed}','true');
 else raise exception 'Unknown reward' using errcode='22023'; end if;
 p:=jsonb_set(p,'{lastReward}',to_jsonb(p_key));
 s:=jsonb_set(s,'{progression}',p);
 s:=jsonb_set(s,'{coins}',to_jsonb(coalesce((s->>'coins')::bigint,0)+coins));
 s:=jsonb_set(s,'{cruiserCharges}',to_jsonb(coalesce((s->>'cruiserCharges')::bigint,0)+boards));
 s:=jsonb_set(s,'{wapsiTickets}',to_jsonb(coalesce((s->>'wapsiTickets')::bigint,0)+tickets));
 receipt:=jsonb_build_object('coins',coins,'boards',boards,'tickets',tickets,'name',reward_name);
 insert into public.player_reward_claims(user_id,reward_key,reward) values(uid,p_key,receipt);
 update public.player_saves set save_data=s where user_id=uid returning * into r;
 return jsonb_build_object('user_id',uid,'save_data',s,'updated_at',r.updated_at,'already_claimed',false,'reward',receipt);
end $$;
revoke all on function public.sync_player_save(timestamptz,jsonb) from public;
revoke all on function public.claim_player_reward(text,text) from public;
grant execute on function public.sync_player_save(timestamptz,jsonb) to authenticated;
grant execute on function public.claim_player_reward(text,text) to authenticated;
notify pgrst, 'reload schema';
