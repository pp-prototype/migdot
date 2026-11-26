begin;

insert into public.app_modules (module_id) values ('meta-wallet');

create table public.meta_wallet_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  revision uuid not null,
  workspace jsonb not null check (
    jsonb_typeof(workspace) = 'object'
    and workspace ?& array['journal', 'plan']
    and jsonb_typeof(workspace->'journal') = 'object'
    and jsonb_typeof(workspace->'plan') = 'object'
  )
);

alter table public.meta_wallet_workspaces enable row level security;
revoke all on public.meta_wallet_workspaces from public, anon, authenticated;
grant select, insert, update on public.meta_wallet_workspaces to authenticated;

create policy own_meta_wallet on public.meta_wallet_workspaces for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.can_access_module('meta-wallet')))
  with check (owner_id = (select auth.uid()) and (select public.can_access_module('meta-wallet')));

commit;
