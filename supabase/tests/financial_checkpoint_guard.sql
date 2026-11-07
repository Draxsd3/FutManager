-- Execute after E2/E3 migrations. All effects are confined to a temporary table and rolled back.
begin;
create temporary table financial_checkpoint_test (state jsonb);
create trigger financial_checkpoint before update on financial_checkpoint_test
for each row execute function public.guard_game_save_checkpoint();
insert into financial_checkpoint_test values ('{"sync":{"token":"first"},"progress":{"engine":{"revision":2,"rulesVersion":"foundation-finance-v2"},"managerMarket":{"finance":{"version":1,"through":"2026-02-01"}}}}');
do $$ begin
 begin
  update financial_checkpoint_test set state='{"sync":{"token":"stale","parent":"wrong"},"progress":{"engine":{"revision":3}}}';
  raise exception 'stale writer accepted';
 exception when serialization_failure then null; end;
 begin
  update financial_checkpoint_test set state='{"sync":{"token":"drop","parent":"first"},"progress":{"engine":{"revision":3,"rulesVersion":"foundation-finance-v2"}}}';
  raise exception 'financial book deletion accepted';
 exception when serialization_failure then null; end;
 begin
  update financial_checkpoint_test set state='{"sync":{"token":"rewind","parent":"first"},"progress":{"engine":{"revision":3,"rulesVersion":"foundation-finance-v2"},"managerMarket":{"finance":{"version":1,"through":"2026-01-01"}}}}';
  raise exception 'financial rewind accepted';
 exception when serialization_failure then null; end;
 begin
  update financial_checkpoint_test set state='{"sync":{"token":"legacy","parent":"first"},"progress":{"engine":{"revision":3,"rulesVersion":"foundation-v1"},"managerMarket":{"finance":{"version":1,"through":"2026-02-01"}}}}';
  raise exception 'legacy rules downgrade accepted';
 exception when serialization_failure then null; end;
end $$;
update financial_checkpoint_test set state='{"sync":{"token":"second","parent":"first"},"progress":{"engine":{"revision":3,"rulesVersion":"foundation-finance-v2"},"managerMarket":{"finance":{"version":1,"through":"2026-03-01"}}}}';
select state #>> '{sync,token}' = 'second'
 and state #>> '{progress,managerMarket,finance,through}' = '2026-03-01' as finance_guard_passed
from financial_checkpoint_test;
rollback;
