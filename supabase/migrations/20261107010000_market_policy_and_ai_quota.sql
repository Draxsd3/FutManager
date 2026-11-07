-- Additive E4 checkpoint compatibility. Preserve E2/E3 CAS, without changing any career row.
create or replace function public.guard_game_save_checkpoint()
returns trigger language plpgsql set search_path = public as $$
declare previous_token text; expected_token text; next_token text;
begin
 previous_token := old.state #>> '{sync,token}';
 expected_token := new.state #>> '{sync,parent}';
 next_token := new.state #>> '{sync,token}';
 if previous_token is distinct from expected_token
 or (previous_token is not null and (next_token is null or next_token = previous_token))
 or coalesce((new.state #>> '{progress,engine,revision}')::bigint,0) < coalesce((old.state #>> '{progress,engine,revision}')::bigint,0)
 or (old.state #>> '{progress,managerMarket,finance,version}' is not null and (
   new.state #>> '{progress,managerMarket,finance,version}' is distinct from old.state #>> '{progress,managerMarket,finance,version}'
   or coalesce(new.state #>> '{progress,engine,rulesVersion}','') not in ('foundation-finance-v2','foundation-market-v3')
   or new.state #>> '{progress,managerMarket,finance,through}' is null
   or new.state #>> '{progress,managerMarket,finance,through}' < old.state #>> '{progress,managerMarket,finance,through}'
 ))
 or (old.state #>> '{progress,engine,rulesVersion}' = 'foundation-market-v3'
     and new.state #>> '{progress,engine,rulesVersion}' is distinct from 'foundation-market-v3')
 or (old.state #>> '{progress,worldMarket,marketState,version}' is not null
     and new.state #>> '{progress,worldMarket,marketState,version}' is distinct from old.state #>> '{progress,worldMarket,marketState,version}')
 then raise exception 'Career checkpoint conflict; reload the save' using errcode = '40001'; end if;
 return new;
end;
$$;

-- Server-only quota/cache. No Gemini key or private save payload is stored here.
create table public.market_ai_requests (
 owner_id uuid not null references auth.users(id) on delete cascade,
 save_id uuid not null references public.game_saves(id) on delete cascade,
 decision_id text not null check (length(decision_id) between 1 and 300),
 context_hash text not null check (context_hash ~ '^[a-f0-9]{64}$'),
 state_revision bigint not null default 0 check (state_revision>=0),
 requested_at timestamptz not null default now(),
 result jsonb,
 primary key (owner_id,save_id,decision_id)
);
create index market_ai_requests_quota on public.market_ai_requests(owner_id,requested_at);
create unique index market_ai_requests_revision on public.market_ai_requests(owner_id,save_id,state_revision);
alter table public.market_ai_requests enable row level security;
revoke all on public.market_ai_requests from public, anon, authenticated;
grant select, insert, update, delete on public.market_ai_requests to service_role;

create function public.claim_market_ai_request(p_user_id uuid,p_save_id uuid,p_decision_id text,p_context_hash text,p_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing public.market_ai_requests%rowtype; minute_count integer; day_count integer;
begin
 -- The service route obtains p_user_id from auth.getUser, never the request body.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,701));
 if not exists (select 1 from public.game_saves where id=p_save_id and owner_id=p_user_id
   and coalesce((state #>> '{progress,engine,revision}')::bigint,0)=p_revision
   and state #>> '{progress,worldMarket,marketState,mode}' in ('assisted','comparison'))
 then return jsonb_build_object('status','forbidden'); end if;
 if p_decision_id not like p_save_id::text || ':market:%' or length(p_decision_id)>300 or p_context_hash !~ '^[a-f0-9]{64}$'
 then return jsonb_build_object('status','conflict'); end if;
 select * into existing from public.market_ai_requests where owner_id=p_user_id and save_id=p_save_id and decision_id=p_decision_id;
 if found then
   if existing.context_hash<>p_context_hash then return jsonb_build_object('status','conflict'); end if;
   return jsonb_build_object('status',case when existing.result is null then 'busy' else 'cached' end,'result',existing.result);
 end if;
 if exists (select 1 from public.market_ai_requests where owner_id=p_user_id and save_id=p_save_id and state_revision=p_revision) then return jsonb_build_object('status','busy'); end if;
 select count(*) filter (where requested_at>clock_timestamp()-interval '1 minute'),
        count(*) filter (where requested_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')
 into minute_count,day_count from public.market_ai_requests where owner_id=p_user_id and requested_at >= least(clock_timestamp()-interval '1 minute',date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
 if minute_count>=6 or day_count>=50 then return jsonb_build_object('status','quota'); end if;
 insert into public.market_ai_requests(owner_id,save_id,decision_id,context_hash,state_revision) values(p_user_id,p_save_id,p_decision_id,p_context_hash,p_revision);
 return jsonb_build_object('status','claimed');
end;
$$;
create function public.finish_market_ai_request(p_user_id uuid,p_save_id uuid,p_decision_id text,p_context_hash text,p_result jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
 if p_result is null or octet_length(p_result::text)>4096 then raise exception 'Invalid market response'; end if;
 update public.market_ai_requests set result=p_result where owner_id=p_user_id and save_id=p_save_id and decision_id=p_decision_id and context_hash=p_context_hash and result is null;
end;
$$;
revoke all on function public.claim_market_ai_request(uuid,uuid,text,text,bigint) from public, anon, authenticated;
revoke all on function public.finish_market_ai_request(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_market_ai_request(uuid,uuid,text,text,bigint) to service_role;
grant execute on function public.finish_market_ai_request(uuid,uuid,text,text,jsonb) to service_role;
