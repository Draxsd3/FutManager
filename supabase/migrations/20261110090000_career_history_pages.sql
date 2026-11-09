-- Additive, account/career isolated, content addressed cold history. No save resets.
create table public.career_archive_pages (
 owner_id uuid not null references auth.users(id) on delete cascade,
 save_id uuid not null, id text not null, kind text not null,
 row_count integer not null check(row_count>0),
 byte_count integer not null check(byte_count between 2 and 256000), payload text not null,
 primary key(owner_id,save_id,id),
 check(kind in ('ledger','invoices','contracts','season')),
 check(id ~ '^[a-f0-9]{64}$'),
 check(octet_length(payload)=byte_count),
 check(jsonb_typeof(payload::jsonb)='array'),
 check(jsonb_array_length(payload::jsonb)=row_count),
 check(id=encode(sha256(convert_to(kind||':'||payload,'UTF8')),'hex'))
);
alter table public.career_archive_pages enable row level security;
create policy archive_owner_read on public.career_archive_pages for select to authenticated using(owner_id=auth.uid());
create policy archive_owner_insert on public.career_archive_pages for insert to authenticated with check(owner_id=auth.uid());
-- No UPDATE or DELETE policy: immutable even when addressed by the owning client.
-- Unreferenced uploads after a failed CAS are safe and reusable on retry.
grant select,insert on public.career_archive_pages to authenticated;

create function public.guard_game_save_archive_refs() returns trigger
language plpgsql set search_path=public as $$
declare refs jsonb; r jsonb; oldrefs jsonb;
begin
 refs:=coalesce(new.state #> '{progress,managerMarket,finance,archive,pages}','[]'::jsonb);
 if jsonb_typeof(refs)<>'array' then raise exception 'Invalid history manifest';end if;
 if tg_op='UPDATE' then
  oldrefs:=coalesce(old.state #> '{progress,managerMarket,finance,archive,pages}','[]'::jsonb);
  if exists(select 1 from jsonb_array_elements(oldrefs) with ordinality x(value,n) where refs->(x.n::integer-1) is distinct from x.value) then raise exception 'Immutable financial history removed' using errcode='40001';end if;
 end if;
 for r in select value from jsonb_array_elements(refs) loop
  if not exists(select 1 from career_archive_pages p where p.owner_id=new.owner_id and p.save_id=new.id and p.id=r->>'id'
    and p.kind=r->>'kind' and p.row_count=(r->>'count')::integer and p.byte_count=(r->>'bytes')::integer)
  then raise exception 'Missing or foreign history page' using errcode='40001';end if;
 end loop;
 return new;
end $$;
create trigger game_saves_archive_refs before insert or update on public.game_saves for each row execute function public.guard_game_save_archive_refs();

-- Save publication remains ONE transaction, protected by the existing revision,
-- sync-parent, population and immutable match guards. Pages must already be durable.
create function public.persist_paged_save(p_save jsonb,p_pages jsonb default '[]'::jsonb) returns void
language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or p_save->>'owner_id' is distinct from auth.uid()::text then raise exception 'Wrong owner' using errcode='42501';end if;
 if jsonb_array_length(p_pages)<>0 then raise exception 'Upload bounded pages before publication';end if;
 insert into game_saves(id,owner_id,name,manager_name,club_name,division,round,budget_brl,in_game_date,state,updated_at)
 values((p_save->>'id')::uuid,auth.uid(),p_save->>'name',p_save->>'manager_name',p_save->>'club_name',p_save->>'division',
 (p_save->>'round')::integer,(p_save->>'budget_brl')::numeric,(p_save->>'in_game_date')::date,p_save->'state',(p_save->>'updated_at')::timestamptz)
 on conflict(id) do update set name=excluded.name,manager_name=excluded.manager_name,club_name=excluded.club_name,division=excluded.division,
 round=excluded.round,budget_brl=excluded.budget_brl,in_game_date=excluded.in_game_date,state=excluded.state,updated_at=excluded.updated_at;
end $$;
revoke all on function public.persist_paged_save(jsonb,jsonb) from public;
grant execute on function public.persist_paged_save(jsonb,jsonb) to authenticated;

create or replace function public.guard_game_save_match_reports()
returns trigger language plpgsql set search_path = public as $$
declare current_reports jsonb; previous_reports jsonb; current_index jsonb; f jsonb; r jsonb; a record; current_state jsonb; previous_state jsonb; expanded jsonb; fixture_rows jsonb; page jsonb; item record; old_archive jsonb;
begin
 current_state:=new.state;
 previous_state:=case when tg_op='UPDATE' then old.state else '{}'::jsonb end;
 -- Unchanged cold seasons need neither reading nor expanding on every autosave.
 -- On legacy->cold conversion (or first insertion), reconstruct EXACT original
 -- season, then run every pre-existing archive and report guard below.
 for item in select key,value from jsonb_each(coalesce(current_state #> '{progress,seasonHistory}','{}'::jsonb)) loop
  if item.value ? 'cold' then
   old_archive:=previous_state #> array['progress','seasonHistory',item.key];
   if old_archive ? 'cold' then
    if old_archive is distinct from item.value then raise exception 'Cold season is immutable' using errcode='40001';end if;
   else
    if item.value #> '{season,fixtures}' <> '[]'::jsonb or jsonb_typeof(item.value #> '{cold,pages}') is distinct from 'array' then raise exception 'Invalid cold season';end if;
    fixture_rows:='[]'::jsonb;
    for page in select value from jsonb_array_elements(item.value #> '{cold,pages}') loop
     select payload::jsonb into expanded from career_archive_pages p where p.owner_id=new.owner_id and p.save_id=new.id
      and p.id=page->>'id' and p.kind='season' and p.row_count=(page->>'count')::integer and p.byte_count=(page->>'bytes')::integer;
     if expanded is null then raise exception 'Missing season page' using errcode='40001';end if;
     fixture_rows:=fixture_rows||expanded;
    end loop;
    expanded:=jsonb_set(item.value-'cold','{season,fixtures}',fixture_rows);
    current_state:=jsonb_set(current_state,array['progress','seasonHistory',item.key],expanded);
   end if;
  end if;
 end loop;
 if current_state #> '{progress,seasonHistory}' is not null and jsonb_typeof(current_state #> '{progress,seasonHistory}') is distinct from 'object'
 then raise exception 'Invalid season history' using errcode='40001'; end if;
 for a in select key,value from jsonb_each(coalesce(current_state #> '{progress,seasonHistory}','{}'::jsonb)) loop
   if a.key !~ '^[0-9]{4}$' or jsonb_typeof(a.value) is distinct from 'object'
     or a.value->>'version' is distinct from '1' or a.value->>'rulesVersion' is distinct from 'season-archive-v1'
     or a.value->>'id' is distinct from new.id::text || ':' || a.key
     or a.value #>> '{season,season}' is distinct from a.key
     or jsonb_typeof(a.value #> '{season,fixtures}') is distinct from 'array'
     or coalesce(a.value->>'closedOn','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   then raise exception 'Invalid season archive' using errcode='40001'; end if;
   if exists(select 1 from jsonb_array_elements(a.value #> '{season,fixtures}') x where coalesce(x->>'status','') not in ('played','cancelled'))
   then raise exception 'Unfinished season archive' using errcode='40001'; end if;
 end loop;
 if tg_op='UPDATE' and exists (
   select 1 from jsonb_each(coalesce(previous_state #> '{progress,seasonHistory}','{}'::jsonb)) x
   where (current_state #> '{progress,seasonHistory}')->x.key is distinct from x.value
 ) then raise exception 'Season archive is immutable; reload the save' using errcode='40001'; end if;
 with seasons as (
   select current_state #> '{progress,competitionSeason}' as s
   union all select value->'competitionSeason' from jsonb_each(coalesce(current_state #> '{progress,jobClubSnapshots}','{}'::jsonb))
   union all select value->'season' from jsonb_each(coalesce(current_state #> '{progress,seasonHistory}','{}'::jsonb))
 ) select coalesce(jsonb_agg(value),'[]'::jsonb) into current_reports
 from seasons cross join lateral jsonb_array_elements(coalesce(s->'fixtures','[]'::jsonb))
 where value->'report' is not null and value->'report' <> 'null'::jsonb;
 for f in select value from jsonb_array_elements(current_reports) loop
   r:=f->'report';
   if jsonb_typeof(r) is distinct from 'object' or r->>'version' is distinct from '1'
     or r->>'rulesVersion' is distinct from 'matches-v1' or coalesce(r->>'origin','') not in ('live','background')
     or coalesce(r->>'disciplinePolicy','') not in ('automatic-red-only-v1','brazil-cards-v2')
     or (r ? 'granularity' and r->>'granularity' is distinct from '15-minute-v2')
     or (r ? 'plans' and jsonb_typeof(r->'plans') is distinct from 'array')
     or (r ? 'substitutions' and jsonb_typeof(r->'substitutions') is distinct from 'array')
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
 -- Identical archive copies are valid; contradictory IDs are not.
 if exists(select 1 from jsonb_array_elements(current_reports) x group by x->>'id' having count(distinct x)>1)
 then raise exception 'Contradictory match identities' using errcode='40001'; end if;
 select coalesce(jsonb_object_agg(value->>'id',value),'{}'::jsonb) into current_index from jsonb_array_elements(current_reports);
 if tg_op='UPDATE' then
   with seasons as (
     select previous_state #> '{progress,competitionSeason}' as s
     union all select value->'competitionSeason' from jsonb_each(coalesce(previous_state #> '{progress,jobClubSnapshots}','{}'::jsonb))
     union all select value->'season' from jsonb_each(coalesce(previous_state #> '{progress,seasonHistory}','{}'::jsonb))
   ) select coalesce(jsonb_agg(value),'[]'::jsonb) into previous_reports
   from seasons cross join lateral jsonb_array_elements(coalesce(s->'fixtures','[]'::jsonb))
   where value->'report' is not null and value->'report' <> 'null'::jsonb;
   -- A year can have been archived BEFORE rollover. Only when reported fixtures
   -- leave the hot calendar, consult that year's already verified cold pages.
   -- Ordinary autosaves do not re-read any closed career season.
   for item in select key,value from jsonb_each(coalesce(new.state #> '{progress,seasonHistory}','{}'::jsonb)) loop
    if item.value ? 'cold' and exists(select 1 from jsonb_array_elements(previous_reports) o where o->>'season'=item.key and not current_index ? (o->>'id')) then
     for page in select value from jsonb_array_elements(item.value #> '{cold,pages}') loop
      select payload::jsonb into expanded from career_archive_pages p where p.owner_id=new.owner_id and p.save_id=new.id and p.id=page->>'id' and p.kind='season';
      if expanded is null then raise exception 'Missing season page' using errcode='40001';end if;
      select coalesce(jsonb_object_agg(value->>'id',value),'{}'::jsonb) into fixture_rows from jsonb_array_elements(expanded) where value->'report' is not null;
      current_index:=fixture_rows||current_index;
     end loop;
    end if;
   end loop;
   if exists (
     select 1 from jsonb_array_elements(previous_reports) o
     where current_index->(o->>'id') is distinct from o
   ) then raise exception 'Completed match history is immutable; reload the save' using errcode='40001'; end if;
 end if;
 return new;
end;
$$;
