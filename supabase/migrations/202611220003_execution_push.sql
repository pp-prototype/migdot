begin;

create table public.execution_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (
    length(endpoint) <= 2048 and endpoint ~
      '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com)/[^[:space:]]+$'
  ),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth_key text not null check (auth_key ~ '^[A-Za-z0-9_-]{22}$')
);

create table public.execution_push_deliveries (
  subscription_id uuid not null references public.execution_push_subscriptions(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('tasks', 'routines')),
  primary key (subscription_id, day, kind)
);
create index execution_push_deliveries_day on public.execution_push_deliveries(day);

alter table public.execution_push_subscriptions enable row level security;
alter table public.execution_push_deliveries enable row level security;
revoke all on public.execution_push_subscriptions, public.execution_push_deliveries from public, anon, authenticated;
grant delete on public.execution_push_subscriptions to service_role;
grant select (id, owner_id) on public.execution_push_subscriptions to service_role;

create function public.has_execution_push_subscription(push_endpoint text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_access_module('execution-tracker') and exists (
    select 1 from public.execution_push_subscriptions
    where endpoint = push_endpoint and owner_id = auth.uid()
  )
$$;

create function public.enable_execution_push(push_endpoint text, encryption_key text, browser_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_access_module('execution-tracker') then
    raise exception 'Module access required' using errcode = '42501';
  end if;
  insert into public.execution_push_subscriptions as existing (owner_id, endpoint, p256dh, auth_key)
    values (auth.uid(), push_endpoint, encryption_key, browser_secret)
  on conflict (endpoint) do update set owner_id = excluded.owner_id
    where existing.p256dh = excluded.p256dh and existing.auth_key = excluded.auth_key;
  if not found then raise exception 'Subscription keys do not match' using errcode = '22023'; end if;
end
$$;

create function public.disable_execution_push(push_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.execution_push_subscriptions where endpoint = push_endpoint and owner_id = auth.uid()
$$;

-- Only the sender can claim eligible subscriptions. Claiming before delivery prevents
-- duplicate sends when multiple scheduled invocations overlap.
create function public.claim_execution_push_batch(send_at timestamptz default now())
returns table (subscription_id uuid, owner_id uuid, endpoint text, p256dh text, auth_key text, kind text, remaining_count bigint, day date)
language plpgsql security definer set search_path = '' as $$
declare
  local_time timestamp := send_at at time zone 'Asia/Seoul';
  today date := local_time::date;
  reminder_kind text;
begin
  case extract(hour from local_time)
    when 17 then reminder_kind := 'tasks';
    when 21 then reminder_kind := 'routines';
    else return;
  end case;
  -- Four five-minute batches plus a final opportunity for scheduler delays.
  if extract(minute from local_time) >= 25 then return; end if;
  delete from public.execution_push_deliveries d where d.day < today - 30;
  return query
    with eligible as materialized (
      select s.id, s.owner_id, s.endpoint, s.p256dh, s.auth_key, pending.total
      from public.execution_push_subscriptions s
      join public.app_members m on m.user_id = s.owner_id and m.active
      join public.app_modules a on a.module_id = 'execution-tracker' and a.enabled
      cross join lateral (
        select case reminder_kind when 'tasks' then (
          select count(*) from public.execution_tasks t
          where t.owner_id = s.owner_id and t.status = 'open' and t.scheduled_date <= today
        ) else (
          select count(*) from public.execution_routines r
          where r.owner_id = s.owner_id and not r.archived and r.created_on <= today
          and not exists (
            select 1 from public.execution_routine_checks c
            where c.owner_id = s.owner_id and c.routine_id = r.id and c.day = today
          )
        ) end as total
      ) pending
      where pending.total > 0
        and (m.role = 'owner' or exists (
          select 1 from public.app_module_grants g where g.user_id = s.owner_id and g.module_id = a.module_id
        ))
        and not exists (
          select 1 from public.execution_push_deliveries d
          where d.subscription_id = s.id and d.day = today and d.kind = reminder_kind
        )
      order by s.id
      limit 100
      for update of s skip locked
    ), claimed as (
      insert into public.execution_push_deliveries(subscription_id, day, kind)
      select e.id, today, reminder_kind from eligible e
      on conflict on constraint execution_push_deliveries_pkey do nothing
      returning execution_push_deliveries.subscription_id
    )
    select e.id, e.owner_id, e.endpoint, e.p256dh, e.auth_key, reminder_kind, e.total, today
    from eligible e join claimed c on c.subscription_id = e.id;
end
$$;

revoke all on function public.has_execution_push_subscription(text), public.enable_execution_push(text,text,text), public.disable_execution_push(text) from public, anon;
grant execute on function public.has_execution_push_subscription(text), public.enable_execution_push(text,text,text), public.disable_execution_push(text) to authenticated;
revoke all on function public.claim_execution_push_batch(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_execution_push_batch(timestamptz) to service_role;

commit;
