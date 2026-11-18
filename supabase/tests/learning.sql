-- Local fixtures share the accounts from access.sql.
insert into public.app_module_grants(user_id, module_id)
values ('22222222-2222-4222-8222-222222222222', 'post-it-learner');

set role anon;
do $$ begin
  begin perform * from public.learning_topics; raise exception 'anonymous topics readable'; exception when insufficient_privilege then null; end;
  begin perform * from public.learning_notes; raise exception 'anonymous notes readable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.learning_topics(id, owner_id, name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), 'Owner topic');
insert into public.learning_notes(id, owner_id, topic_id, title, body)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', auth.uid(), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner note', 'Private');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare
  member_topic uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  owner_topic uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  note_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
begin
  assert not exists (select from public.learning_topics);
  assert not exists (select from public.learning_notes);
  update public.learning_notes set title='Cross-owner edit';
  assert not found;
  delete from public.learning_notes;
  assert not found;

  insert into public.learning_topics(id, owner_id, name) values (member_topic, auth.uid(), 'Member topic');
  begin
    insert into public.learning_notes(id, owner_id, topic_id, title, body) values (note_id, auth.uid(), owner_topic, 'Cross-owner reference', 'Body');
    raise exception 'cross-owner relation accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.learning_notes(id, owner_id, topic_id, title, body)
    values (note_id, '11111111-1111-4111-8111-111111111111', owner_topic, 'Forged owner', 'Body');
    raise exception 'owner spoof accepted';
  exception when insufficient_privilege then null;
  end;
  insert into public.learning_notes(id, owner_id, topic_id, title, body) values (note_id, auth.uid(), member_topic, 'My note', 'Body');
  update public.learning_topics set description='My description' where id=member_topic and version=1;
  assert found;
  update public.learning_topics set thumbnail_jpeg='/9j/AQ==' where id=member_topic and version=2;
  assert found;
  begin
    update public.learning_topics set thumbnail_jpeg='https://example.invalid/cover.jpg' where id=member_topic;
    raise exception 'non-JPEG thumbnail reference accepted';
  exception when check_violation then null;
  end;
  assert (select thumbnail_jpeg from public.learning_topics where id=member_topic)='/9j/AQ==';
  update public.learning_notes set title='My edit', photo_jpeg='/9j/AQ==' where id=note_id and version=1;
  assert found;
  update public.learning_notes set title='Stale edit' where id=note_id and version=1;
  assert not found;
  delete from public.learning_notes where id=note_id and version=1;
  assert not found;
  assert (select version from public.learning_notes where id=note_id)=2;
  assert (select photo_jpeg from public.learning_notes where id=note_id)='/9j/AQ==';
  begin
    update public.learning_notes set photo_jpeg='invalid image' where id=note_id;
    raise exception 'invalid note photo accepted';
  exception when check_violation then null;
  end;
  begin
    update public.learning_notes set owner_id='11111111-1111-4111-8111-111111111111' where id=note_id;
    raise exception 'owner change accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
  assert (select count(*) from public.learning_topics)=1;
  assert (select count(*) from public.learning_notes)=1;
  assert not exists (select from public.learning_notes where title='My edit');
end $$;
select public.admin_set_module_access('22222222-2222-4222-8222-222222222222','post-it-learner',false);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  assert not exists (select from public.learning_topics);
  assert not exists (select from public.learning_notes);
  begin
    insert into public.learning_topics(id, owner_id, name) values (gen_random_uuid(), auth.uid(), 'Revoked');
    raise exception 'revoked insert accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
delete from auth.users where id='22222222-2222-4222-8222-222222222222';
