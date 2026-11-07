-- Additive protection on the canonical game_saves aggregate, under existing RLS.
-- No table recreation, reset, data backfill or privilege expansion.
create or replace function public.guard_game_save_checkpoint()
returns trigger language plpgsql set search_path = public as $$
declare
  previous_token text;
  expected_token text;
  next_token text;
begin
  previous_token := old.state #>> '{sync,token}';
  expected_token := new.state #>> '{sync,parent}';
  next_token := new.state #>> '{sync,token}';
  if previous_token is distinct from expected_token
     or (previous_token is not null and (next_token is null or next_token = previous_token))
     or coalesce((new.state #>> '{progress,engine,revision}')::bigint,0) < coalesce((old.state #>> '{progress,engine,revision}')::bigint,0)
  then
    raise exception 'Career checkpoint conflict; reload the save' using errcode = '40001';
  end if;
  return new;
end;
$$;
drop trigger if exists game_save_checkpoint_cas on public.game_saves;
create trigger game_save_checkpoint_cas before update on public.game_saves
for each row execute function public.guard_game_save_checkpoint();
