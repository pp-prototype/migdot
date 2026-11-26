begin;

insert into auth.users (id) values
  ('77777777-7777-4777-8777-777777777777'),
  ('88888888-8888-4888-8888-888888888888');
insert into public.app_members (user_id) values
  ('77777777-7777-4777-8777-777777777777'),
  ('88888888-8888-4888-8888-888888888888');
insert into public.app_module_grants (user_id, module_id)
values ('77777777-7777-4777-8777-777777777777', 'meta-wallet');

set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
insert into public.meta_wallet_workspaces (revision, workspace)
values (gen_random_uuid(), '{"journal":{},"plan":{}}');
update public.meta_wallet_workspaces set workspace = '{"journal":{"private":{}},"plan":{}}';
do $$ begin
  assert exists (select from public.meta_wallet_workspaces where workspace->'journal' ? 'private');
end $$;

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);
do $$ begin
  assert not exists (select from public.meta_wallet_workspaces);
  begin
    insert into public.meta_wallet_workspaces (revision, workspace)
    values (gen_random_uuid(), '{"journal":{},"plan":{}}');
    raise exception 'Unentitled member could create a wallet';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
insert into public.app_module_grants (user_id, module_id)
values ('88888888-8888-4888-8888-888888888888', 'meta-wallet');
set local role authenticated;
do $$ begin
  assert not exists (select from public.meta_wallet_workspaces);
  update public.meta_wallet_workspaces set workspace = '{"journal":{},"plan":{}}';
  assert not found;
  begin
    insert into public.meta_wallet_workspaces (owner_id, revision, workspace)
    values ('77777777-7777-4777-8777-777777777777', gen_random_uuid(), '{"journal":{},"plan":{}}');
    raise exception 'Wallet insert accepted another owner ID';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.meta_wallet_workspaces (revision, workspace)
values (gen_random_uuid(), '{"journal":{},"plan":{}}');
do $$ begin
  assert (select count(*) from public.meta_wallet_workspaces) = 1;
end $$;

reset role;
delete from public.app_module_grants
where user_id = '88888888-8888-4888-8888-888888888888' and module_id = 'meta-wallet';
set local role authenticated;
do $$ begin
  assert not exists (select from public.meta_wallet_workspaces);
  update public.meta_wallet_workspaces set workspace = '{"journal":{},"plan":{}}';
  assert not found;
end $$;

rollback;
