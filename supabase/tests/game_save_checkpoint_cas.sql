-- Run in a SQL session after the checkpoint migration. No user rows are read or changed.
begin;
create temporary table engine_checkpoint_test (state jsonb);
create trigger test_checkpoint before update on engine_checkpoint_test
for each row execute function public.guard_game_save_checkpoint();
insert into engine_checkpoint_test values ('{}');
update engine_checkpoint_test set state='{"sync":{"token":"first","parent":null},"progress":{"engine":{"revision":1}}}';
do $$ begin
 begin
  update engine_checkpoint_test set state='{"sync":{"token":"stale","parent":null},"progress":{"engine":{"revision":1}}}';
  raise exception 'CAS did not reject stale writer';
 exception when serialization_failure then null; end;
 begin
  update engine_checkpoint_test set state='{"sync":{"token":"rewind","parent":"first"},"progress":{"engine":{"revision":0}}}';
  raise exception 'CAS did not reject revision downgrade';
 exception when serialization_failure then null; end;
 begin
  update engine_checkpoint_test set state='{}';
  raise exception 'CAS did not reject legacy downgrade';
 exception when serialization_failure then null; end;
end $$;
update engine_checkpoint_test set state='{"sync":{"token":"second","parent":"first"},"progress":{"engine":{"revision":2}}}';
select state #>> '{sync,token}' = 'second' and state #>> '{progress,engine,revision}' = '2' as cas_checks_passed from engine_checkpoint_test;
rollback;
