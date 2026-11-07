-- Bound the pilot on the server as well as in the client: one provider attempt per career revision.
-- Also require the persisted owner to have opted into assisted/comparison mode.
alter table public.market_ai_requests add column if not exists state_revision bigint not null default 0 check (state_revision>=0);
create unique index if not exists market_ai_requests_revision on public.market_ai_requests(owner_id,save_id,state_revision);
create or replace function public.claim_market_ai_request(p_user_id uuid,p_save_id uuid,p_decision_id text,p_context_hash text,p_revision bigint)
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
