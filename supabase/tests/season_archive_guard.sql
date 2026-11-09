-- Synthetic rows only. No reads/writes of private saves.
begin;
create temporary table season_archive_probe(id uuid default gen_random_uuid(), state jsonb not null) on commit drop;
create trigger archive_probe before insert or update on season_archive_probe
for each row execute function public.guard_game_save_match_reports();
do $$
declare fixture jsonb; modern_id uuid; legacy_id uuid; before_state jsonb; candidate jsonb;
begin
 fixture:='{"id":"synthetic-2026","competitionId":"league:A","homeClubId":"synthetic-home","awayClubId":"synthetic-away","status":"played","homeScore":0,"awayScore":0,"playerContributions":[],"report":{"version":1,"rulesVersion":"matches-v1","origin":"background","seed":"probe","disciplinePolicy":"brazil-cards-v2","granularity":"15-minute-v2","plans":[],"substitutions":[],"goals":[],"cards":[],"servedBans":[]}}';
 insert into season_archive_probe(state) values(jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('season',2026,'fixtures',jsonb_build_array(fixture))))) returning id into modern_id;
 insert into season_archive_probe(state) values(jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('season',2026,'fixtures',jsonb_build_array(fixture #- '{report}'))))) returning id into legacy_id;
 insert into season_archive_probe(state) values(jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('season',2026,'fixtures',jsonb_build_array(jsonb_set(fixture #- '{report,granularity}' #- '{report,plans}' #- '{report,substitutions}','{report,disciplinePolicy}','"automatic-red-only-v1"'))))));
 update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory}',jsonb_build_object('2026',jsonb_build_object('version',1,'rulesVersion','season-archive-v1','id',id::text||':2026','closedOn','2026-12-31','season',state #> '{progress,competitionSeason}','summary',jsonb_build_object('goals',0),'honours','[]'::jsonb)));
 -- Move active results to the archive. Both modern and report-less legacy survive.
 update season_archive_probe set state=jsonb_set(state,'{progress,competitionSeason}','{"season":2027,"fixtures":[]}');
 update season_archive_probe set state=jsonb_set(state,'{progress,page}','"hub"');
 update season_archive_probe set state=jsonb_set(state,'{progress,jobClubSnapshots}',jsonb_build_object('former-club',jsonb_build_object('competitionSeason',state #> '{progress,seasonHistory,2026,season}')));
 select state into before_state from season_archive_probe where id=modern_id;
 begin update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory,2026,season,fixtures,0,status}','"scheduled"') where id=modern_id;raise exception 'unfinished archive accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=state #- '{progress,seasonHistory}' where id=modern_id;raise exception 'archive removal accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory,2026,summary,goals}','1') where id=modern_id;raise exception 'summary mutation accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory,2026,honours}','[{}]') where id=modern_id;raise exception 'honour mutation accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory,2026,season,fixtures,0,homeScore}','1') where id=modern_id;raise exception 'score mutation accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=state #- '{progress,seasonHistory}' where id=legacy_id;raise exception 'legacy archive removal accepted';exception when serialization_failure then null;end;
 begin update season_archive_probe set state=jsonb_set(state,'{progress,seasonHistory}','[]') where id=modern_id;raise exception 'array archive accepted';exception when serialization_failure then null;end;
 candidate:=jsonb_set(before_state,'{progress,seasonHistory,2026,id}','"wrong-owner:2026"');
 begin insert into season_archive_probe(state) values(candidate);raise exception 'foreign archive owner accepted';exception when serialization_failure then null;end;
 -- Match report structure and score reconciliation remain enforced on new writes.
 candidate:=jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('season',2026,'fixtures',jsonb_build_array(jsonb_set(fixture,'{report,disciplinePolicy}','"unsupported"')))));
 begin insert into season_archive_probe(state) values(candidate);raise exception 'unknown report policy accepted';exception when serialization_failure then null;end;
 if (select state from season_archive_probe where id=modern_id) is distinct from before_state then raise exception 'failed mutation changed durable synthetic state';end if;
end $$;
select 'season_archive_guard_passed' as result, count(*) as synthetic_rows from season_archive_probe;
rollback;
