-- Fixtures are local only; never run this test file in a hosted project.
reset role;
update public.app_members set active=true where user_id='22222222-2222-4222-8222-222222222222';
insert into public.app_module_grants(user_id,module_id) values('22222222-2222-4222-8222-222222222222','execution-tracker');
set role anon;
do $$ begin
  begin perform public.get_execution_workspace(); raise exception 'anonymous workspace readable'; exception when insufficient_privilege then null; end;
  begin perform public.change_execution_workspace(0,'create_task','{"title":"forged"}'); raise exception 'anonymous write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
  begin perform public.get_execution_workspace(); raise exception 'pending workspace readable'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare w jsonb; task uuid; routine uuid; today date := (now() at time zone 'Asia/Seoul')::date; begin
  w := public.get_execution_workspace(); assert w->>'revision'='0'; assert w->'tasks'='[]'::jsonb;
  w := public.change_execution_workspace(0,'create_task',jsonb_build_object('title','My task','owner_id','11111111-1111-4111-8111-111111111111'));
  assert w->>'revision'='1'; assert jsonb_array_length(w->'tasks')=1;
  task := (w->'tasks'->0->>'id')::uuid;
  perform set_config('test.execution_task',task::text,false);
  assert w->'tasks'->0->>'owner_id'=auth.uid()::text;
  assert (w->'tasks'->0->>'original_date')::date=today;
  begin perform public.change_execution_workspace(0,'create_task','{"title":"stale"}'); raise exception 'stale write accepted'; exception when serialization_failure then null; end;
  begin insert into public.execution_tasks(owner_id,title,original_date,scheduled_date) values(auth.uid(),'direct',today,today); raise exception 'direct write accepted'; exception when insufficient_privilege then null; end;
  begin perform public.change_execution_workspace(1,'create_task',jsonb_build_object('title','backdated','day',today-1)); raise exception 'backdate accepted'; exception when invalid_parameter_value then null; end;
  w := public.change_execution_workspace(1,'start_task',jsonb_build_object('id',task)); assert w->>'active_id'=task::text;
  w := public.change_execution_workspace(2,'schedule_task',jsonb_build_object('id',task,'day',today+7));
  assert (w->'tasks'->0->>'original_date')::date=today;
  assert (w->'tasks'->0->>'scheduled_date')::date=today+7;
  assert w->'active_id'='null'::jsonb;
  begin perform public.change_execution_workspace(3,'complete_task',jsonb_build_object('id',task)); raise exception 'future completion accepted'; exception when invalid_parameter_value then null; end;
  w := public.change_execution_workspace(3,'schedule_task',jsonb_build_object('id',task,'day',today));
  w := public.change_execution_workspace(4,'complete_task',jsonb_build_object('id',task)); assert w->'tasks'->0->>'status'='completed';
  w := public.change_execution_workspace(5,'reopen_task',jsonb_build_object('id',task));
  assert w->'tasks'->0->>'status'='open'; assert w->'tasks'->0->'completed_at'='null'::jsonb;
  assert jsonb_array_length(w->'events')=6;
  w := public.change_execution_workspace(6,'close_day','{"reflection":"Learned","tomorrow":"Small action"}');
  assert (w->'days'->0->>'closed')::boolean;
  begin perform public.change_execution_workspace(7,'complete_task',jsonb_build_object('id',task)); raise exception 'closed day modified'; exception when invalid_parameter_value then null; end;
  w := public.change_execution_workspace(7,'reopen_day','{}'); assert not (w->'days'->0->>'closed')::boolean;
  assert w->'days'->0->>'reflection'='Learned';
  w := public.change_execution_workspace(8,'create_routine','{"title":"Read"}'); routine := (w->'routines'->0->>'id')::uuid;
  w := public.change_execution_workspace(9,'check_routine',jsonb_build_object('id',routine,'checked',true));
  assert jsonb_array_length(w->'checks')=1;
  w := public.change_execution_workspace(10,'check_routine',jsonb_build_object('id',routine,'checked',true));
  assert jsonb_array_length(w->'checks')=1, 'no duplicate checks';
  w := public.change_execution_workspace(11,'archive_routine',jsonb_build_object('id',routine));
  assert jsonb_array_length(w->'checks')=1, 'archiving preserves history';
  assert (w->'routines'->0->>'archived')::boolean;
  w := public.change_execution_workspace(12,'pause_task',jsonb_build_object('id',task)); assert w->'tasks'->0->>'status'='paused';
  w := public.change_execution_workspace(13,'resume_task',jsonb_build_object('id',task)); assert w->'tasks'->0->>'status'='open';
  w := public.change_execution_workspace(14,'cancel_task',jsonb_build_object('id',task)); assert w->'tasks'->0->>'status'='cancelled';
  assert jsonb_array_length(w->'events')=9;
end $$;

do $$ declare w jsonb; replay jsonb; begin
  w := public.change_execution_workspace(15,'create_task','{"title":"Still private","request_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}');
  replay := public.change_execution_workspace(15,'create_task','{"title":"Still private","request_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}');
  assert (replay->>'replayed')::boolean;
  assert w->'tasks'=replay->'tasks';
  assert w->'revision'=replay->'revision';
  assert w->'events'=replay->'events';
  perform set_config('test.execution_task',(select id::text from public.execution_tasks where title='Still private'),false);
end $$;

-- An owner is an operator, not the owner of another user's personal records.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
  assert public.get_execution_workspace()->'tasks'='[]'::jsonb;
  assert (select count(*) from public.execution_tasks)=0;
  assert (select count(*) from public.execution_task_events)=0;
  assert (select count(*) from public.execution_routine_checks)=0;
  begin perform public.change_execution_workspace(0,'edit_task',jsonb_build_object('id',current_setting('test.execution_task'),'title','tamper')); raise exception 'foreign edit accepted'; exception when invalid_parameter_value then null; end;
  perform public.admin_set_module_access('22222222-2222-4222-8222-222222222222','execution-tracker',false);
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  assert (select count(*) from public.execution_tasks)=0;
  begin perform public.get_execution_workspace(); raise exception 'revoked read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.change_execution_workspace(15,'create_task','{"title":"revoked"}'); raise exception 'revoked write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
