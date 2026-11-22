begin;

insert into auth.users(id, email) values
  ('a1000000-0000-4000-8000-000000000001', 'push-one@example.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'push-two@example.invalid');
insert into public.app_members(user_id, role)
select id, 'member' from auth.users where email like 'push-%@example.invalid';
insert into public.app_module_grants(user_id, module_id)
select id, 'execution-tracker' from auth.users where email like 'push-%@example.invalid';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public.enable_execution_push('https://fcm.googleapis.com/fcm/send/local-test-one', repeat('A', 87), repeat('A', 22));

do $$
begin
  assert public.has_execution_push_subscription('https://fcm.googleapis.com/fcm/send/local-test-one');
  assert not has_function_privilege(current_user, 'public.claim_execution_push_batch(timestamptz)', 'execute');
  assert not has_table_privilege(current_user, 'public.execution_push_subscriptions', 'select');
  begin
    perform public.enable_execution_push('https://fcm.googleapis.com.evil.example/fcm/send/local-test', repeat('A', 87), repeat('A', 22));
    raise exception 'Expected endpoint validation';
  exception when check_violation then null;
  end;
end
$$;

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select public.disable_execution_push('https://fcm.googleapis.com/fcm/send/local-test-one');
select public.enable_execution_push('https://web.push.apple.com/local-test-two', repeat('A', 87), repeat('A', 22));
do $$
begin
  assert not public.has_execution_push_subscription('https://fcm.googleapis.com/fcm/send/local-test-one');
  assert public.has_execution_push_subscription('https://web.push.apple.com/local-test-two');
end
$$;
reset role;

insert into public.execution_tasks(owner_id, title, original_date, scheduled_date, status) values
  ('a1000000-0000-4000-8000-000000000001', 'Today', '2026-11-22', '2026-11-22', 'open'),
  ('a1000000-0000-4000-8000-000000000001', 'Overdue', '2026-11-21', '2026-11-21', 'open'),
  ('a1000000-0000-4000-8000-000000000001', 'Later', '2026-11-23', '2026-11-23', 'open'),
  ('a1000000-0000-4000-8000-000000000001', 'Paused', '2026-11-21', '2026-11-21', 'paused'),
  ('a1000000-0000-4000-8000-000000000002', 'Done', '2026-11-21', '2026-11-21', 'completed');

insert into public.execution_routines(owner_id, title, created_on, archived) values
  ('a1000000-0000-4000-8000-000000000001', 'Missed', '2026-11-21', false),
  ('a1000000-0000-4000-8000-000000000001', 'Checked', '2026-11-21', false),
  ('a1000000-0000-4000-8000-000000000001', 'Archived', '2026-11-21', true),
  ('a1000000-0000-4000-8000-000000000002', 'Revoked', '2026-11-21', false);
insert into public.execution_routine_checks(owner_id, routine_id, day)
select owner_id, id, date '2026-11-22' from public.execution_routines where title = 'Checked';

set local role service_role;
do $$
declare result record;
begin
  assert (select count(*) from public.claim_execution_push_batch('2026-11-22 07:59Z')) = 0;
  select * into strict result from public.claim_execution_push_batch('2026-11-22 08:00Z');
  assert result.owner_id = 'a1000000-0000-4000-8000-000000000001';
  assert result.kind = 'tasks' and result.remaining_count = 2;
  assert (select count(*) from public.claim_execution_push_batch('2026-11-22 08:05Z')) = 0;
end
$$;
reset role;

delete from public.app_module_grants where user_id = 'a1000000-0000-4000-8000-000000000002';
set local role service_role;
do $$
declare result record;
begin
  select * into strict result from public.claim_execution_push_batch('2026-11-22 12:00Z');
  assert result.owner_id = 'a1000000-0000-4000-8000-000000000001';
  assert result.kind = 'routines' and result.remaining_count = 1;
  assert (select count(*) from public.claim_execution_push_batch('2026-11-22 12:05Z')) = 0;
  assert (select count(*) from public.claim_execution_push_batch('2026-11-23 12:25Z')) = 0;
end
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public.disable_execution_push('https://fcm.googleapis.com/fcm/send/local-test-one');
do $$
begin
  assert not public.has_execution_push_subscription('https://fcm.googleapis.com/fcm/send/local-test-one');
end
$$;
reset role;
set local role service_role;
do $$
begin
  assert (select count(*) from public.claim_execution_push_batch('2026-11-23 08:00Z')) = 0;
end
$$;

rollback;
