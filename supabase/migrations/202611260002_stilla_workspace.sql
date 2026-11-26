begin;

insert into public.app_modules (module_id) values ('stilla');

create table public.stilla_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  revision uuid not null,
  workspace jsonb not null check (
    jsonb_typeof(workspace) = 'object'
    and workspace ?& array['words', 'examples', 'connections', 'reviews', 'session']
    and jsonb_typeof(workspace->'words') = 'array'
    and jsonb_typeof(workspace->'examples') = 'array'
    and jsonb_typeof(workspace->'connections') = 'array'
    and jsonb_typeof(workspace->'reviews') = 'array'
    and jsonb_typeof(workspace->'session') in ('null', 'object')
  )
);

alter table public.stilla_workspaces enable row level security;
revoke all on public.stilla_workspaces from public, anon, authenticated;
grant select, insert, update on public.stilla_workspaces to authenticated;

create policy own_stilla_workspace on public.stilla_workspaces for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.can_access_module('stilla')))
  with check (owner_id = (select auth.uid()) and (select public.can_access_module('stilla')));

commit;
