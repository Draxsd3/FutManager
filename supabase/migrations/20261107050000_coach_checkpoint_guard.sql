-- Additive E5 guard. No career update/backfill, permission expansion or financial reset.
-- Complements the E2/E4 CAS guard; older clients must not erase canonical coach identities.
create or replace function public.guard_game_save_staff_checkpoint()
returns trigger language plpgsql set search_path = public as $$
declare s jsonb; previous jsonb; person record; employer text; occupied text[] := '{}'; employment jsonb;
begin
 s := new.state #> '{progress,managerMarket,staff}';
 if tg_op = 'UPDATE' then previous := old.state #> '{progress,managerMarket,staff}'; end if;
 if previous is not null and (
   s is null or s->>'version' is distinct from previous->>'version'
   or s->>'rulesVersion' is distinct from previous->>'rulesVersion'
   or s->>'humanId' is distinct from previous->>'humanId'
   or not coalesce((s->'coaches') ?& array(select jsonb_object_keys(previous->'coaches')), false)
 ) then raise exception 'Coach checkpoint conflict; reload the save' using errcode = '40001'; end if;
 if s is null then return new; end if;
 if s->>'version' is distinct from '1' or s->>'rulesVersion' is distinct from 'coaches-v1'
   or jsonb_typeof(s->'coaches') is distinct from 'object'
   or not coalesce((s->'coaches') ? (s->>'humanId'),false)
 then raise exception 'Invalid coach checkpoint' using errcode = '40001'; end if;
 for person in select key,value from jsonb_each(s->'coaches') loop
   if person.value->>'id' is distinct from person.key then raise exception 'Invalid coach identity' using errcode = '40001'; end if;
   employer := person.value->>'clubId';
   if employer is not null then
     employment := new.state #> array['progress','managerMarket','finance','contracts','coach:' || person.key];
     if employer = any(occupied)
       or new.state #>> array['progress','managerMarket','clubs',employer,'coach'] is distinct from person.value->>'name'
       or employment->>'status' is distinct from 'active'
       or employment->>'personKind' is distinct from 'coach'
       or employment->>'clubId' is distinct from employer
       or employment->>'id' is distinct from person.value #>> '{contract,id}'
     then raise exception 'Incompatible coach employment' using errcode = '40001'; end if;
     occupied := array_append(occupied,employer);
   end if;
 end loop;
 return new;
end;
$$;
create trigger game_save_staff_checkpoint before insert or update on public.game_saves
for each row execute function public.guard_game_save_staff_checkpoint();
