-- Rollback-only fixtures. No private save/user rows are read, changed or retained.
begin;
create temporary table market_checkpoint_test(state jsonb);
create trigger checkpoint before update on market_checkpoint_test for each row execute function public.guard_game_save_checkpoint();
insert into market_checkpoint_test values ('{"sync":{"token":"first"},"progress":{"engine":{"revision":2,"rulesVersion":"foundation-finance-v2"},"managerMarket":{"finance":{"version":1,"through":"2026-02-01"}}}}');
update market_checkpoint_test set state='{"sync":{"token":"second","parent":"first"},"progress":{"engine":{"revision":3,"rulesVersion":"foundation-market-v3"},"worldMarket":{"marketState":{"version":1}},"managerMarket":{"finance":{"version":1,"through":"2026-02-01"}}}}';
do $$ begin
 begin
  update market_checkpoint_test set state=jsonb_set(jsonb_set(state,'{sync}','{"token":"bad","parent":"second"}'),'{progress,engine,rulesVersion}','"foundation-finance-v2"');
  raise exception 'E4 downgrade accepted';
 exception when serialization_failure then null; end;
 begin
  update market_checkpoint_test set state=jsonb_set(state #- '{progress,worldMarket,marketState}','{sync}','{"token":"bad","parent":"second"}');
  raise exception 'market aggregate deletion accepted';
 exception when serialization_failure then null; end;
 begin
  update market_checkpoint_test set state=jsonb_set(state,'{sync}','{"token":"bad","parent":"first"}');
  raise exception 'stale token accepted';
 exception when serialization_failure then null; end;
 begin
  update market_checkpoint_test set state=jsonb_set(jsonb_set(state,'{sync}','{"token":"bad","parent":"second"}'),'{progress,managerMarket,finance,through}','"2026-01-01"');
  raise exception 'financial rewind accepted';
 exception when serialization_failure then null; end;
end $$;
update market_checkpoint_test set state=jsonb_set(state,'{sync}','{"token":"third","parent":"second"}');

do $$
declare u uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid(); s3 uuid:=gen_random_uuid(); chosen uuid; key text; answer jsonb; i integer;
begin
 insert into auth.users(id,email) values(u,'e4-rollback-'||u||'@example.invalid'),(u2,'e4-rollback-'||u2||'@example.invalid');
 insert into public.game_saves(id,owner_id,name,manager_name,in_game_date,state) values
 (s,u,'E4 rollback fixture','fixture','2026-01-11','{"progress":{"engine":{"revision":0},"worldMarket":{"marketState":{"mode":"assisted"}}}}'),
 (s2,u2,'E4 rollback fixture','fixture','2026-01-11','{"progress":{"engine":{"revision":0},"worldMarket":{"marketState":{"mode":"assisted"}}}}'),
 (s3,u,'E4 rollback fixture','fixture','2026-01-11','{"progress":{"engine":{"revision":0},"worldMarket":{"marketState":{"mode":"assisted"}}}}');
 key:=s||':market:one';
 update public.game_saves set state=jsonb_set(state,'{progress,worldMarket,marketState,mode}','"internal"') where id=s;
 if (public.claim_market_ai_request(u,s,key,repeat('a',64),0)->>'status') is distinct from 'forbidden' then raise exception 'non-opted-in career accepted'; end if;
 update public.game_saves set state=jsonb_set(state,'{progress,worldMarket,marketState,mode}','"assisted"') where id=s;
 if (public.claim_market_ai_request(u2,s,key,repeat('a',64),0)->>'status') is distinct from 'forbidden' then raise exception 'other owner accepted'; end if;
 if (public.claim_market_ai_request(u,s,key,repeat('a',64),1)->>'status') is distinct from 'forbidden' then raise exception 'wrong revision accepted'; end if;
 if (public.claim_market_ai_request(u,s,key,repeat('a',64),0)->>'status') is distinct from 'claimed' then raise exception 'first request not claimed'; end if;
 if (public.claim_market_ai_request(u,s,key,repeat('a',64),0)->>'status') is distinct from 'busy' then raise exception 'pending request duplicated'; end if;
 perform public.finish_market_ai_request(u,s,key,repeat('a',64),'{"error":"test-failure"}');
 answer:=public.claim_market_ai_request(u,s,key,repeat('a',64),0);
 if answer->>'status' is distinct from 'cached' or answer #>> '{result,error}' is distinct from 'test-failure' then raise exception 'cache failed'; end if;
 if (public.claim_market_ai_request(u,s,key,repeat('b',64),0)->>'status') is distinct from 'conflict' then raise exception 'context identity changed'; end if;
 if (public.claim_market_ai_request(u,s,s||':market:other-context',repeat('a',64),0)->>'status') is distinct from 'busy' then raise exception 'per-revision budget bypass'; end if;
 for i in 2..6 loop
  chosen:=case when i%2=0 then s else s3 end;
  update public.game_saves set state=jsonb_set(state,'{progress,engine,revision}',to_jsonb(i)) where id=chosen;
  if (public.claim_market_ai_request(u,chosen,chosen||':market:'||i,repeat('a',64),i)->>'status') is distinct from 'claimed' then raise exception 'quota counted incorrectly'; end if;
 end loop;
 update public.game_saves set state=jsonb_set(state,'{progress,engine,revision}','7') where id=s;
 if (public.claim_market_ai_request(u,s,s||':market:seven',repeat('a',64),7)->>'status') is distinct from 'quota' then raise exception 'minute quota bypass'; end if;
 -- A separate account does not inherit the first account's limit.
 if (public.claim_market_ai_request(u2,s2,s2||':market:first',repeat('a',64),0)->>'status') is distinct from 'claimed' then raise exception 'account isolation failed'; end if;
 delete from public.market_ai_requests where owner_id=u2;
 update public.game_saves set state=jsonb_set(state,'{progress,engine,revision}','100') where id=s2;
 for i in 1..50 loop
  insert into public.market_ai_requests(owner_id,save_id,decision_id,context_hash,state_revision,requested_at) values(u2,s2,s2||':market:historical:'||i,repeat('c',64),i,date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
 end loop;
 if (public.claim_market_ai_request(u2,s2,s2||':market:fifty-one',repeat('c',64),100)->>'status') is distinct from 'quota' then raise exception 'daily quota bypass'; end if;
 if has_function_privilege('authenticated','public.claim_market_ai_request(uuid,uuid,text,text,bigint)','execute') or has_function_privilege('anon','public.finish_market_ai_request(uuid,uuid,text,text,jsonb)','execute') or has_table_privilege('authenticated','public.market_ai_requests','SELECT,INSERT,UPDATE,DELETE') then raise exception 'server-only permission leak'; end if;
end $$;
select true as market_guard_and_quota_passed;
rollback;
