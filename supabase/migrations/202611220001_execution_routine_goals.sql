begin;

alter table public.execution_routines
  add column goal text not null default '' check (char_length(goal) <= 160),
  add column expected_outcome text not null default '' check (char_length(expected_outcome) <= 160),
  add column target_days integer not null default 7 check (target_days between 1 and 7);

create or replace function public.change_execution_workspace(expected_revision bigint, command text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); today date := (now() at time zone 'Asia/Seoul')::date;
  current_revision bigint; target uuid; t public.execution_tasks; r public.execution_routines;
  requested_day date; v_request_id uuid := (payload->>'request_id')::uuid;
begin
  if u is null or not public.can_access_module('execution-tracker') then
    raise exception 'Module access required' using errcode = '42501';
  end if;
  insert into public.execution_workspaces(owner_id) values(u) on conflict do nothing;
  select revision into current_revision from public.execution_workspaces where owner_id=u for update;
  if v_request_id is not null and exists(select 1 from public.execution_requests q where q.owner_id=u and q.request_id=v_request_id) then
    return public.get_execution_workspace() || '{"replayed":true}'::jsonb;
  end if;
  if expected_revision is distinct from current_revision then
    raise exception 'Workspace changed; reload before retry' using errcode = '40001';
  end if;
  if command not in ('close_day','reopen_day') and exists(select 1 from public.execution_days where owner_id=u and day=today and closed) then
    raise exception 'Reopen today before editing' using errcode = '22023';
  end if;
  if command = 'create_task' then
    requested_day := coalesce((payload->>'day')::date,today);
    if requested_day < today or requested_day > today + 3660 then raise exception 'Invalid planned day' using errcode='22023'; end if;
    insert into public.execution_tasks(owner_id,title,next_action,original_date,scheduled_date)
      values(u,trim(payload->>'title'),coalesce(trim(payload->>'next_action'),''),requested_day,requested_day) returning * into t;
  elsif command in ('edit_task','start_task','complete_task','reopen_task','schedule_task','pause_task','resume_task','cancel_task') then
    target := (payload->>'id')::uuid;
    select * into t from public.execution_tasks where id=target and owner_id=u;
    if not found or t.status='cancelled' then raise exception 'Task not found' using errcode='22023'; end if;
    if command='edit_task' then
      update public.execution_tasks set title=trim(payload->>'title'), next_action=coalesce(trim(payload->>'next_action'),'') where id=t.id returning * into t;
    elsif command='start_task' then
      if t.status<>'open' or t.scheduled_date>today then raise exception 'Task not available today' using errcode='22023'; end if;
      update public.execution_workspaces set active_id=case when active_id=t.id then null else t.id end where owner_id=u;
    elsif command='complete_task' then
      if t.status<>'open' or t.scheduled_date>today then raise exception 'Task not available today' using errcode='22023'; end if;
      update public.execution_tasks set status='completed',completed_at=now() where id=t.id returning * into t;
    elsif command='reopen_task' then
      if t.status<>'completed' then raise exception 'Task not completed' using errcode='22023'; end if;
      update public.execution_tasks set status='open',completed_at=null where id=t.id returning * into t;
    elsif command='schedule_task' then
      requested_day := (payload->>'day')::date;
      if t.status not in ('open','paused') or requested_day is null or requested_day<today or requested_day>today+3660 then raise exception 'Invalid planned day' using errcode='22023'; end if;
      update public.execution_tasks set scheduled_date=requested_day,status='open' where id=t.id returning * into t;
    elsif command='pause_task' then
      if t.status<>'open' then raise exception 'Task not open' using errcode='22023'; end if;
      update public.execution_tasks set status='paused' where id=t.id returning * into t;
    elsif command='resume_task' then
      if t.status<>'paused' then raise exception 'Task not paused' using errcode='22023'; end if;
      update public.execution_tasks set status='open',scheduled_date=today where id=t.id returning * into t;
    elsif command='cancel_task' then
      update public.execution_tasks set status='cancelled' where id=t.id returning * into t;
    end if;
    if command<>'start_task' then update public.execution_workspaces set active_id=null where owner_id=u and active_id=t.id; end if;
  elsif command='create_routine' then
    insert into public.execution_routines(owner_id,title,goal,expected_outcome,target_days)
      values(u,trim(payload->>'title'),coalesce(trim(payload->>'goal'),''),coalesce(trim(payload->>'expected_outcome'),''),coalesce((payload->>'target_days')::integer,7))
      returning * into r;
  elsif command in ('edit_routine','archive_routine','check_routine') then
    select * into r from public.execution_routines where id=(payload->>'id')::uuid and owner_id=u and not archived;
    if not found then raise exception 'Routine not found' using errcode='22023'; end if;
    if command='edit_routine' then
      update public.execution_routines
        set title=trim(payload->>'title'),
            goal=coalesce(trim(payload->>'goal'),r.goal),
            expected_outcome=coalesce(trim(payload->>'expected_outcome'),r.expected_outcome),
            target_days=coalesce((payload->>'target_days')::integer,r.target_days)
        where id=r.id;
    elsif command='archive_routine' then update public.execution_routines set archived=true where id=r.id;
    else
      requested_day := coalesce((payload->>'day')::date,today);
      if requested_day<r.created_on or requested_day>today then raise exception 'Invalid practice day' using errcode='22023'; end if;
      if exists(select 1 from public.execution_days where owner_id=u and day=requested_day and closed) then raise exception 'Reopen day before editing' using errcode='22023'; end if;
      if coalesce((payload->>'checked')::boolean,false) then
        insert into public.execution_routine_checks(owner_id,routine_id,day) values(u,r.id,requested_day) on conflict do nothing;
      else delete from public.execution_routine_checks where owner_id=u and routine_id=r.id and day=requested_day;
      end if;
    end if;
  elsif command in ('close_day','reopen_day') then
    requested_day := coalesce((payload->>'day')::date,today);
    if requested_day>today or requested_day<date '2000-01-01' then raise exception 'Invalid journal day' using errcode='22023'; end if;
    if command='close_day' then
      insert into public.execution_days(owner_id,day,closed,reflection,tomorrow)
        values(u,requested_day,true,coalesce(payload->>'reflection',''),coalesce(payload->>'tomorrow',''))
        on conflict(owner_id,day) do update set closed=true,reflection=excluded.reflection,tomorrow=excluded.tomorrow;
      if requested_day=today then update public.execution_workspaces set active_id=null where owner_id=u; end if;
    else update public.execution_days set closed=false where owner_id=u and day=requested_day;
    end if;
  else raise exception 'Unknown command' using errcode='22023';
  end if;
  if t.id is not null then
    insert into public.execution_task_events(owner_id,task_id,action,snapshot) values(u,t.id,command,to_jsonb(t));
  end if;
  update public.execution_workspaces set revision=revision+1 where owner_id=u;
  if v_request_id is not null then insert into public.execution_requests values(u,v_request_id); end if;
  return public.get_execution_workspace();
end $$;

commit;
