-- Run transactionally against the installed guard; never reads private careers.
begin;
create temporary table e7_match_probe(id integer primary key,state jsonb);
create trigger e7_match_probe_guard before insert or update on e7_match_probe for each row execute function public.guard_game_save_match_reports();
do $$
declare f jsonb := '{"id":"e7-test","competitionId":"league","homeClubId":"home","awayClubId":"away","status":"played","homeScore":0,"awayScore":0,"playerContributions":[],"report":{"version":1,"rulesVersion":"matches-v1","origin":"live","seed":"fixture-seed","goals":[],"cards":[],"servedBans":[],"disciplinePolicy":"automatic-red-only-v1"}}'; base jsonb; bad jsonb; accepted boolean;
begin
 insert into e7_match_probe values(1,'{"progress":{"competitionSeason":{"fixtures":[]}}}');
 base:=jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('fixtures',jsonb_build_array(f))));
 update e7_match_probe set state=base where id=1;
 update e7_match_probe set state=jsonb_set(state,'{progress,minute}','10') where id=1;
 for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(base,'{progress,competitionSeason,fixtures}','[]'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,report}','null'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,homeScore}','1'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,competitionId}','"another-competition"'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,report,version}','2')
 )) loop
   accepted:=true;
   begin update e7_match_probe set state=bad where id=1; exception when sqlstate '40001' then accepted:=false; end;
   if accepted then raise exception 'Invalid report rewrite accepted'; end if;
 end loop;
 base:=jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('fixtures','[]'::jsonb),'jobClubSnapshots',jsonb_build_object('old-club',jsonb_build_object('competitionSeason',jsonb_build_object('fixtures',jsonb_build_array(f))))));
 update e7_match_probe set state=base where id=1;
 bad:=jsonb_set(base,'{progress,competitionSeason,fixtures}',jsonb_build_array(jsonb_set(f,'{report,seed}','"changed"')));
 accepted:=true;
 begin update e7_match_probe set state=bad where id=1; exception when sqlstate '40001' then accepted:=false; end;
 if accepted then raise exception 'Contradictory duplicate accepted'; end if;
 insert into e7_match_probe values(2,'{"progress":{"competitionSeason":{"fixtures":[{"id":"legacy","status":"played","homeScore":2,"awayScore":0}]}}}');
end;
$$;
select true as match_report_guard_passed,true as legacy_and_job_archive_passed;
rollback;
