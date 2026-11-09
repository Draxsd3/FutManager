-- E7: additive immutable result history. No backfill/reset and no data grants.
create or replace function public.guard_game_save_match_reports()
returns trigger language plpgsql set search_path = public as $$
declare current_reports jsonb; previous_reports jsonb; f jsonb; r jsonb;
begin
 with seasons as (
   select new.state #> '{progress,competitionSeason}' as s
   union all select value->'competitionSeason' from jsonb_each(coalesce(new.state #> '{progress,jobClubSnapshots}','{}'::jsonb))
 ) select coalesce(jsonb_agg(value),'[]'::jsonb) into current_reports
 from seasons cross join lateral jsonb_array_elements(coalesce(s->'fixtures','[]'::jsonb))
 where value->'report' is not null and value->'report' <> 'null'::jsonb;
 for f in select value from jsonb_array_elements(current_reports) loop
   r:=f->'report';
   if jsonb_typeof(r) is distinct from 'object' or r->>'version' is distinct from '1'
     or r->>'rulesVersion' is distinct from 'matches-v1' or coalesce(r->>'origin','') not in ('live','background')
     or r->>'disciplinePolicy' is distinct from 'automatic-red-only-v1'
     or coalesce(r->>'seed','')='' or coalesce(f->>'id','')='' or coalesce(f->>'competitionId','')=''
     or coalesce(f->>'homeClubId','')='' or coalesce(f->>'awayClubId','')='' or f->>'homeClubId'=f->>'awayClubId'
     or jsonb_typeof(f->'homeScore') is distinct from 'number' or jsonb_typeof(f->'awayScore') is distinct from 'number'
     or f->>'status' is distinct from 'played'
     or coalesce(f->>'homeScore','') !~ '^[0-9]{1,3}$' or coalesce(f->>'awayScore','') !~ '^[0-9]{1,3}$'
     or jsonb_typeof(r->'goals') is distinct from 'array' or jsonb_typeof(r->'cards') is distinct from 'array'
     or jsonb_typeof(r->'servedBans') is distinct from 'array' or jsonb_typeof(f->'playerContributions') is distinct from 'array'
   then raise exception 'Invalid match report' using errcode='40001'; end if;
   if (f->>'homeScore')::integer>100 or (f->>'awayScore')::integer>100
     or (select count(*) from jsonb_array_elements(r->'goals') g where g->>'clubId'=f->>'homeClubId')<>(f->>'homeScore')::integer
     or (select count(*) from jsonb_array_elements(r->'goals') g where g->>'clubId'=f->>'awayClubId')<>(f->>'awayScore')::integer
     or exists(select 1 from jsonb_array_elements(r->'goals') g where g->>'clubId' is null or g->>'clubId' not in (f->>'homeClubId',f->>'awayClubId'))
   then raise exception 'Match goals do not reconcile' using errcode='40001'; end if;
 end loop;
 if tg_op='UPDATE' then
   with seasons as (
     select old.state #> '{progress,competitionSeason}' as s
     union all select value->'competitionSeason' from jsonb_each(coalesce(old.state #> '{progress,jobClubSnapshots}','{}'::jsonb))
   ) select coalesce(jsonb_agg(value),'[]'::jsonb) into previous_reports
   from seasons cross join lateral jsonb_array_elements(coalesce(s->'fixtures','[]'::jsonb))
   where value->'report' is not null and value->'report' <> 'null'::jsonb;
   if exists (
     select 1 from jsonb_array_elements(previous_reports) o
     where not exists(select 1 from jsonb_array_elements(current_reports) n where n->>'id'=o->>'id')
       or exists(select 1 from jsonb_array_elements(current_reports) n where n->>'id'=o->>'id' and n is distinct from o)
   ) then raise exception 'Completed match history is immutable; reload the save' using errcode='40001'; end if;
 end if;
 return new;
end;
$$;
create trigger game_save_match_report_checkpoint before insert or update on public.game_saves
for each row execute function public.guard_game_save_match_reports();
