\set ON_ERROR_STOP on
insert into auth.users(id, email) values
 ('11111111-1111-4111-8111-111111111111','owner@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','member@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','pending@example.invalid');
insert into public.app_members(user_id, role) values ('11111111-1111-4111-8111-111111111111','owner');

-- Demonstrates the mandatory permission AND ownership policy for future module data.
create table public.access_probe(id int primary key, owner_id uuid not null, value text);
alter table public.access_probe enable row level security;
revoke all on public.access_probe from anon, authenticated;
grant select, insert, update, delete on public.access_probe to authenticated;
create policy probe_select on public.access_probe for select to authenticated
 using (public.can_access_module('post-it-learner') and owner_id=(select auth.uid()));
create policy probe_insert on public.access_probe for insert to authenticated
 with check (public.can_access_module('post-it-learner') and owner_id=(select auth.uid()));
create policy probe_update on public.access_probe for update to authenticated
 using (public.can_access_module('post-it-learner') and owner_id=(select auth.uid()))
 with check (public.can_access_module('post-it-learner') and owner_id=(select auth.uid()));
create policy probe_delete on public.access_probe for delete to authenticated
 using (public.can_access_module('post-it-learner') and owner_id=(select auth.uid()));
insert into public.access_probe values
 (1,'11111111-1111-4111-8111-111111111111','owner data'),
 (2,'22222222-2222-4222-8222-222222222222','member data');

set role anon;
do $$ begin
 begin perform public.get_app_access(); raise exception 'anon access unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.app_members; raise exception 'anon membership unexpectedly readable'; exception when insufficient_privilege then null; end;
 begin perform * from public.access_probe; raise exception 'anon data unexpectedly readable'; exception when insufficient_privilege then null; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
 assert (public.get_app_access()->>'approved')::boolean = false, 'new auth user must not auto-approve';
 assert public.get_app_access()->'module_ids'='[]'::jsonb;
 assert not public.can_access_module('post-it-learner');
 begin insert into public.app_members values(auth.uid(),'owner',true); raise exception 'self-promotion unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_set_app_member(auth.uid(),true); raise exception 'pending approval unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_list_app_members(); raise exception 'pending user list unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
 assert (public.get_app_access()->>'role')='owner';
 assert jsonb_array_length(public.get_app_access()->'module_ids')=5;
 assert jsonb_array_length(public.admin_list_app_members())=3;
 assert not public.can_access_module('missing');
 begin perform public.admin_set_app_member(auth.uid(),false); raise exception 'owner removal unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.admin_set_app_member('22222222-2222-4222-8222-222222222222',true);
select public.admin_set_module_access('22222222-2222-4222-8222-222222222222','post-it-learner',true);
select public.admin_set_module_access('22222222-2222-4222-8222-222222222222','post-it-learner',true);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare count_rows int; begin
 assert (public.get_app_access()->>'approved')::boolean;
 assert public.get_app_access()->'module_ids'='["post-it-learner"]'::jsonb;
 assert public.can_access_module('post-it-learner');
 assert not public.can_access_module('execution-tracker');
 assert (select count(*) from public.app_members)=1, 'membership rows must be scoped';
 assert (select count(*) from public.access_probe)=1, 'owner data must stay private even with same module access';
 begin perform public.admin_set_module_access(auth.uid(),'execution-tracker',true); raise exception 'self-grant unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.app_module_grants values(auth.uid(),'execution-tracker'); raise exception 'direct self-grant unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_list_app_members(); raise exception 'member user list unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.access_probe values(3,'11111111-1111-4111-8111-111111111111','forged'); raise exception 'forged insert unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin update public.access_probe set owner_id='11111111-1111-4111-8111-111111111111' where id=2; raise exception 'forged update unexpectedly allowed'; exception when insufficient_privilege then null; end;
 update public.access_probe set value='updated own' where id=2;
 get diagnostics count_rows=row_count; assert count_rows=1;
 delete from public.access_probe where id=1;
 get diagnostics count_rows=row_count; assert count_rows=0, 'another user data must not be deletable';
 insert into public.access_probe values(3,auth.uid(),'own insert');
 delete from public.access_probe where id=3;
 get diagnostics count_rows=row_count; assert count_rows=1;
end $$;

-- Same user ID/token context after revocation: current DB permissions must win.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.admin_set_module_access('22222222-2222-4222-8222-222222222222','post-it-learner',false);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare count_rows int; begin
 assert not public.can_access_module('post-it-learner');
 assert (select count(*) from public.access_probe)=0;
 update public.access_probe set value='revoked write' where id=2;
 get diagnostics count_rows=row_count; assert count_rows=0;
 delete from public.access_probe where id=2;
 get diagnostics count_rows=row_count; assert count_rows=0;
 begin insert into public.access_probe values(4,auth.uid(),'revoked'); raise exception 'revoked insert unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.admin_set_module_access('22222222-2222-4222-8222-222222222222','execution-tracker',true);
select public.admin_set_app_member('22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
 assert not (public.get_app_access()->>'approved')::boolean;
 assert public.get_app_access()->'module_ids'='[]'::jsonb;
 assert (select count(*) from public.app_module_grants)=0;
end $$;
reset role;
update public.app_modules set enabled=false where module_id='meetings';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin assert not public.can_access_module('meetings'), 'disabled module must also be closed to owner'; end $$;
reset role;
\echo PASS: anonymous denial, no auto-promotion, owner RPCs, module grants, ownership, forged writes, live revocation, member disable, disabled modules
