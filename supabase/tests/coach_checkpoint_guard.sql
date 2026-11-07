begin;
create temporary table e5_staff_fixture (state jsonb);
create trigger e5_staff_guard before insert or update on e5_staff_fixture for each row execute function public.guard_game_save_staff_checkpoint();
insert into e5_staff_fixture values ('{"progress":{"managerMarket":{"staff":{"version":1,"rulesVersion":"coaches-v1","humanId":"human:test","coaches":{"human:test":{"id":"human:test","name":"Teste","clubId":"a","contract":{"id":"contract:test"}}}},"clubs":{"a":{"coach":"Teste"}},"finance":{"contracts":{"coach:human:test":{"id":"contract:test","personKind":"coach","clubId":"a","status":"active"}}}}}}');
do $$
begin
 begin update e5_staff_fixture set state=state #- '{progress,managerMarket,staff}'; raise exception 'erasure accepted'; exception when serialization_failure then null; end;
 begin update e5_staff_fixture set state=jsonb_set(state,'{progress,managerMarket,staff,humanId}','"other"'); raise exception 'identity overwrite accepted'; exception when serialization_failure then null; end;
 begin update e5_staff_fixture set state=jsonb_set(state,'{progress,managerMarket,staff,coaches,human:test,clubId}','"b"'); raise exception 'incompatible employment accepted'; exception when serialization_failure then null; end;
 begin update e5_staff_fixture set state=jsonb_set(state,'{progress,managerMarket,staff,coaches,duplicate}',state #> '{progress,managerMarket,staff,coaches,human:test}'); raise exception 'duplicate identity accepted'; exception when serialization_failure then null; end;
end;
$$;
-- A canonical release remains valid. No real career or private save was read.
update e5_staff_fixture set state=jsonb_set(state,'{progress,managerMarket,staff,coaches,human:test,clubId}','null');
select true as coach_guard_passed;
rollback;
