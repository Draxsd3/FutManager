-- Preserve adopted financial aggregates even if an older client reads the row.
-- No backfill, balance reset, new table or permission changes.
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
   or new.state #>> '{progress,engine,rulesVersion}' is distinct from 'foundation-finance-v2'
   or new.state #>> '{progress,managerMarket,finance,through}' is null
   or new.state #>> '{progress,managerMarket,finance,through}' < old.state #>> '{progress,managerMarket,finance,through}'
 ))
 then raise exception 'Career checkpoint conflict; reload the save' using errcode = '40001'; end if;
 return new;
end;
$$;
