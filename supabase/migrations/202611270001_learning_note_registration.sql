begin;

-- Hold both tables while assigning numbers to existing records.
lock table public.learning_topics, public.learning_notes in access exclusive mode;

alter table public.learning_topics add column last_note_number integer not null default 0;
alter table public.learning_notes add column registration_number integer;

alter table public.learning_notes disable trigger learning_note_version;
with numbered as (
  select id, row_number() over (partition by topic_id order by created_at, id) as number
  from public.learning_notes
)
update public.learning_notes as note
set registration_number = numbered.number
from numbered
where note.id = numbered.id;
alter table public.learning_notes enable trigger learning_note_version;

alter table public.learning_notes
  alter column registration_number set not null,
  add constraint learning_note_registration_positive check (registration_number > 0),
  add constraint learning_note_registration_unique unique (topic_id, registration_number);

-- Allocating a note number does not edit the topic's user-facing fields.
drop trigger learning_topic_version on public.learning_topics;
create trigger learning_topic_version before update of name, description, thumbnail_jpeg on public.learning_topics
for each row execute function public.bump_learning_version();

update public.learning_topics as topic
set last_note_number = existing.last_number
from (
  select topic_id, max(registration_number) as last_number
  from public.learning_notes
  group by topic_id
) as existing
where topic.id = existing.topic_id;

create function public.allocate_learning_note_number() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    auth.uid() is distinct from new.owner_id or not public.can_access_module('post-it-learner')
  ) then
    raise insufficient_privilege using message = 'Learning note owner access required';
  end if;

  update public.learning_topics
  set last_note_number = last_note_number + 1
  where id = new.topic_id and owner_id = new.owner_id
  returning last_note_number into new.registration_number;

  if not found then
    raise foreign_key_violation using message = 'Learning topic does not exist for this owner';
  end if;

  return new;
end;
$$;

revoke all on function public.allocate_learning_note_number() from public, anon, authenticated;
create trigger learning_note_number before insert on public.learning_notes
for each row execute function public.allocate_learning_note_number();

commit;
