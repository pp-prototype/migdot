begin;

create table public.learning_topics (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.learning_notes (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  tag text not null default '' check (char_length(tag) <= 40),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  foreign key (topic_id, owner_id) references public.learning_topics(id, owner_id)
);

create index learning_topics_owner_created_idx on public.learning_topics(owner_id, created_at desc, id);
create index learning_notes_topic_created_idx on public.learning_notes(owner_id, topic_id, created_at desc, id);

create function public.bump_learning_version() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger learning_topic_version before update on public.learning_topics
for each row execute function public.bump_learning_version();
create trigger learning_note_version before update on public.learning_notes
for each row execute function public.bump_learning_version();

alter table public.learning_topics enable row level security;
alter table public.learning_notes enable row level security;

create policy learning_topics_owner on public.learning_topics for all to authenticated
using ((select public.can_access_module('post-it-learner')) and owner_id = (select auth.uid()))
with check ((select public.can_access_module('post-it-learner')) and owner_id = (select auth.uid()));

create policy learning_notes_owner on public.learning_notes for all to authenticated
using ((select public.can_access_module('post-it-learner')) and owner_id = (select auth.uid()))
with check ((select public.can_access_module('post-it-learner')) and owner_id = (select auth.uid()));

revoke all on public.learning_topics, public.learning_notes from public, anon, authenticated;
grant select on public.learning_topics, public.learning_notes to authenticated;
grant insert (id, owner_id, name, description), update (name, description) on public.learning_topics to authenticated;
grant insert (id, owner_id, topic_id, title, body, tag), update (title, body, tag) on public.learning_notes to authenticated;
grant delete on public.learning_notes to authenticated;

commit;
