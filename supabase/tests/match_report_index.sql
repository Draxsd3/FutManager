-- Synthetic batch only; never reads private careers.
begin;
create temporary table e7_index_probe(state jsonb);
create trigger e7_index_guard before insert or update on e7_index_probe for each row execute function public.guard_game_save_match_reports();
do $$
declare f jsonb := '{"id":"probe","competitionId":"league","homeClubId":"home","awayClubId":"away","status":"played","homeScore":0,"awayScore":0,"playerContributions":[],"report":{"version":1,"rulesVersion":"matches-v1","origin":"live","seed":"probe-seed","goals":[],"cards":[],"servedBans":[],"disciplinePolicy":"automatic-red-only-v1"}}'; fs jsonb; base jsonb; bad jsonb; accepted boolean;
begin
 select jsonb_agg(jsonb_set(f,'{id}',to_jsonb('probe-'||n))) into fs from generate_series(1,1000) n;
 base:=jsonb_build_object('progress',jsonb_build_object('competitionSeason',jsonb_build_object('fixtures',fs)));
 insert into e7_index_probe values(base);
 update e7_index_probe set state=state;
 for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(base,'{progress,competitionSeason,fixtures}','[]'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,report}','null'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,homeScore}','1'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,competitionId}','"changed"'),
   jsonb_set(base,'{progress,competitionSeason,fixtures,0,report,version}','2')
 )) loop
   accepted:=true;
   begin update e7_index_probe set state=bad; exception when sqlstate '40001' then accepted:=false; end;
   if accepted then raise exception 'Invalid report rewrite accepted'; end if;
 end loop;
 base:=jsonb_set(base,'{progress,jobClubSnapshots}',jsonb_build_object('old',jsonb_build_object('competitionSeason',jsonb_build_object('fixtures',fs))));
 update e7_index_probe set state=base;
 bad:=jsonb_set(base,'{progress,competitionSeason,fixtures,0,report,seed}','"changed"');
 accepted:=true;
 begin update e7_index_probe set state=bad; exception when sqlstate '40001' then accepted:=false; end;
 if accepted then raise exception 'Contradictory duplicate accepted'; end if;
 base:=jsonb_set(base,'{progress,competitionSeason,fixtures}','[]');update e7_index_probe set state=base;
 insert into e7_index_probe values('{"progress":{"competitionSeason":{"fixtures":[{"id":"legacy","status":"played","homeScore":2,"awayScore":0}]}}}');
end;
$$;
select true as indexed_match_guard_passed,1000 as synthetic_report_count,true as legacy_and_archive_passed;
rollback;
