-- Additive E6 guard: no save backfill, catalog rewrite, API dependency or new privileges.
create or replace function public.guard_game_save_player_checkpoint()
returns trigger language plpgsql set search_path = public as $$
declare s jsonb; previous jsonb; person record;
begin
 s := new.state #> '{progress,worldMarket,population}';
 if tg_op = 'UPDATE' then previous := old.state #> '{progress,worldMarket,population}'; end if;
 if previous is not null and (
   s is null or s->>'version' is distinct from previous->>'version'
   or s->>'rulesVersion' is distinct from previous->>'rulesVersion'
   or not coalesce((s->'people') ?& array(select jsonb_object_keys(previous->'people')),false)
   or not coalesce((s->'generated') ?& array(select jsonb_object_keys(previous->'generated')),false)
   or (s is distinct from previous and coalesce((new.state #>> '{progress,engine,revision}')::bigint,0) <= coalesce((old.state #>> '{progress,engine,revision}')::bigint,0))
 ) then raise exception 'Player checkpoint conflict; reload the save' using errcode = '40001'; end if;
 if s is null then return new; end if;
 if s->>'version' is distinct from '1' or s->>'rulesVersion' is distinct from 'players-v1'
   or s->>'through' is distinct from new.state->>'inGameDate'
   or jsonb_typeof(s->'people') is distinct from 'object'
   or jsonb_typeof(s->'generated') is distinct from 'object'
   or jsonb_typeof(s->'fixtures') is distinct from 'array'
   or jsonb_typeof(s->'events') is distinct from 'array'
 then raise exception 'Invalid player checkpoint' using errcode = '40001'; end if;
 for person in select key,value from jsonb_each(s->'people') loop
   if person.value->>'id' is distinct from person.key
     or person.value->>'through' is distinct from s->>'through'
     or jsonb_typeof(person.value->'energy') is distinct from 'number'
     or jsonb_typeof(person.value->'overall') is distinct from 'number'
     or jsonb_typeof(person.value->'potential') is distinct from 'number'
     or (person.value->>'energy')::numeric not between 0 and 100
     or (person.value->>'overall')::numeric not between 0 and 99
     or (person.value->>'potential')::numeric not between (person.value->>'overall')::numeric and 99
   then raise exception 'Invalid player identity or condition' using errcode = '40001'; end if;
 end loop;
 for person in select key,value from jsonb_each(s->'generated') loop
   if person.value->>'id' is distinct from person.key or not ((s->'people') ? person.key)
   then raise exception 'Invalid generated player identity' using errcode = '40001'; end if;
 end loop;
 return new;
end;
$$;
create trigger game_save_player_checkpoint before insert or update on public.game_saves
for each row execute function public.guard_game_save_player_checkpoint();
