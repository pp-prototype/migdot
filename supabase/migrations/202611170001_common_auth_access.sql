-- Common Auth and module access. Run as project database owner.
-- No first user auto-promotion; bootstrap the first owner explicitly in SQL.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.app_modules (
  module_id text primary key,
  enabled boolean not null default true
);
create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  active boolean not null default true
);
create table public.app_module_grants (
  user_id uuid not null references public.app_members(user_id) on delete cascade,
  module_id text not null references public.app_modules(module_id) on delete cascade,
  primary key (user_id, module_id)
);
insert into public.app_modules(module_id) values
  ('meetings'), ('updates'), ('documentations'), ('post-it-learner'), ('execution-tracker');

alter table public.app_modules enable row level security;
alter table public.app_members enable row level security;
alter table public.app_module_grants enable row level security;
revoke all on public.app_modules, public.app_members, public.app_module_grants from anon, authenticated;
grant select on public.app_modules, public.app_members, public.app_module_grants to authenticated;

create function app_private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_members m
    where m.user_id = (select auth.uid()) and m.active and m.role = 'owner');
$$;
create function public.can_access_module(target_module text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_members m
    join public.app_modules a on a.module_id = target_module and a.enabled
    where m.user_id = (select auth.uid()) and m.active
      and (m.role = 'owner' or exists(select 1 from public.app_module_grants g
        where g.user_id = m.user_id and g.module_id = a.module_id)));
$$;
revoke all on function app_private.is_owner() from public, anon, authenticated;
grant execute on function app_private.is_owner() to authenticated;
revoke all on function public.can_access_module(text) from public, anon, authenticated;
grant execute on function public.can_access_module(text) to authenticated;

create policy read_own_membership on public.app_members for select to authenticated
  using (user_id = (select auth.uid()) or (select app_private.is_owner()));
create policy read_own_grants on public.app_module_grants for select to authenticated
  using (user_id = (select auth.uid()) or (select app_private.is_owner()));
create policy read_allowed_modules on public.app_modules for select to authenticated
  using ((select public.can_access_module(module_id)));

create function public.get_app_access()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); member public.app_members%rowtype;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into member from public.app_members where user_id = actor;
  return jsonb_build_object('user_id', actor, 'approved', coalesce(member.active, false),
    'role', case when member.active then member.role else null end,
    'module_ids', coalesce((select jsonb_agg(a.module_id order by a.module_id)
      from public.app_modules a where public.can_access_module(a.module_id)), '[]'::jsonb));
end;
$$;

create function public.admin_list_app_members()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_owner() then raise exception 'Owner required' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', u.id, 'email', coalesce(u.email, ''),
    'role', coalesce(m.role, 'member'), 'active', coalesce(m.active, false),
    'module_ids', coalesce((select jsonb_agg(g.module_id order by g.module_id)
      from public.app_module_grants g where g.user_id = u.id), '[]'::jsonb)) order by u.created_at desc, u.id)
    from (select id, email, created_at from auth.users order by created_at desc, id limit 100) u
    left join public.app_members m on m.user_id = u.id), '[]'::jsonb);
end;
$$;

create function public.admin_set_app_member(target_user uuid, approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(170117001);
  if not app_private.is_owner() then raise exception 'Owner required' using errcode = '42501'; end if;
  if approved is null then raise exception 'Approval required' using errcode = '22023'; end if;
  if exists(select 1 from public.app_members where user_id = target_user and role = 'owner') then
    raise exception 'Owners must be managed in the database console' using errcode = '42501';
  end if;
  insert into public.app_members(user_id, role, active) values (target_user, 'member', approved)
    on conflict (user_id) do update set active = excluded.active;
  if not approved then delete from public.app_module_grants where user_id = target_user; end if;
end;
$$;

create function public.admin_set_module_access(target_user uuid, target_module text, allowed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(170117001);
  if not app_private.is_owner() then raise exception 'Owner required' using errcode = '42501'; end if;
  if allowed is null then raise exception 'Permission required' using errcode = '22023'; end if;
  if not exists(select 1 from public.app_members where user_id = target_user and active and role = 'member') then
    raise exception 'Approved member required' using errcode = '22023';
  end if;
  if not exists(select 1 from public.app_modules where module_id = target_module and enabled) then
    raise exception 'Unknown or disabled module' using errcode = '22023';
  end if;
  if allowed then
    insert into public.app_module_grants(user_id, module_id) values (target_user, target_module) on conflict do nothing;
  else
    delete from public.app_module_grants where user_id = target_user and module_id = target_module;
  end if;
end;
$$;

revoke all on function public.get_app_access(), public.admin_list_app_members(),
  public.admin_set_app_member(uuid, boolean), public.admin_set_module_access(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.get_app_access(), public.admin_list_app_members(),
  public.admin_set_app_member(uuid, boolean), public.admin_set_module_access(uuid, text, boolean)
  to authenticated;
comment on function public.can_access_module(text) is
  'Live permission check for the current auth.uid(). Combine with owner_id=auth.uid() in every future data RLS policy; UI route guards are not data protection.';
commit;
