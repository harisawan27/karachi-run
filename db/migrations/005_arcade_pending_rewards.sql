-- Arcade UI: completed daily prizes survive resets, closing cards and older clients.
-- Account identity, RLS, revision checks and atomic receipt keys are unchanged.
create or replace function public.keep_legacy_player_progression() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare oldp jsonb:=old.save_data->'progression'; p jsonb:=new.save_data->'progression'; claimed jsonb; pending jsonb; completed jsonb:='[]';
begin
 if oldp is null then return new; end if;
 if coalesce((new.save_data->>'version')::int,0)<8 then new.save_data=jsonb_set(new.save_data,'{progression}',oldp);return new;end if;
 if p is null then p:=oldp;end if;
 if coalesce((oldp->'daily'->>'mask')::int,0)=127 and not coalesce((oldp->'daily'->>'claimed')::boolean,false) then completed:=jsonb_build_array(oldp->'daily'->>'day');end if;
 select coalesce(jsonb_agg(day order by day),'[]') into claimed from (
  select distinct value as day from jsonb_array_elements_text(coalesce(oldp->'claimedDaily','[]')||coalesce(p->'claimedDaily','[]'))
  union select substr(reward_key,7) from public.player_reward_claims where user_id=new.user_id and reward_key like 'daily:%'
 ) q;
 select coalesce(jsonb_agg(day order by day),'[]') into pending from (
  select distinct value as day from jsonb_array_elements_text(coalesce(oldp->'pendingDaily','[]')||coalesce(p->'pendingDaily','[]')||completed)
 ) q where day<>coalesce(p->'daily'->>'day','') and not (claimed ? day);
 p:=jsonb_set(jsonb_set(p,'{pendingDaily}',pending),'{claimedDaily}',claimed);
 if not (p ? 'seen') and oldp ? 'seen' then p:=jsonb_set(p,'{seen}',oldp->'seen');end if;
 new.save_data:=jsonb_set(new.save_data,'{progression}',p);return new;
end $$;

create or replace function public.claim_player_reward(p_kind text,p_key text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare uid text:=public.current_player_id(); r public.player_saves%rowtype; s jsonb; p jsonb; receipt jsonb;
 reward_day text;
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
  reward_day:=substr(p_key,7);
  if p_key<>'daily:'||reward_day or reward_day!~'^\d{4}-\d{2}-\d{2}$' or reward_day>today then raise exception 'Invalid daily reward' using errcode='22023'; end if;
  if coalesce(p->'claimedDaily','[]'::jsonb) ? reward_day then return jsonb_build_object('user_id',uid,'save_data',s,'updated_at',r.updated_at,'already_claimed',true,'reward',jsonb_build_object('coins',0,'boards',0,'tickets',0,'name','Already collected')); end if;
  if not (coalesce(p->'pendingDaily','[]'::jsonb) ? reward_day) then
   if p->'daily'->>'day'<>reward_day or coalesce((p->'daily'->>'claimed')::boolean,false) or coalesce((p->'daily'->>'mask')::int,0)<>127 then raise exception 'Complete this KARACHI hunt first' using errcode='22023'; end if;
  end if;
  for j in 1..length(reward_day||uid) loop pick:=(pick+ascii(substr(reward_day||uid,j,1)))%3; end loop;
  if pick=0 then coins:=500;boards:=2;reward_name:='Street Cruiser Pack';
  elsif pick=1 then coins:=350;tickets:=2;reward_name:='Wapsi Pack';
  else coins:=800;boards:=1;reward_name:='Karachi Gold Pack'; end if;
  p:=jsonb_set(p,'{pendingDaily}',coalesce(p->'pendingDaily','[]'::jsonb)-reward_day);
  p:=jsonb_set(p,'{claimedDaily}',coalesce(p->'claimedDaily','[]'::jsonb)||jsonb_build_array(reward_day));
  if p->'daily'->>'day'=reward_day then p:=jsonb_set(p,'{daily,claimed}','true'); end if;
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
