begin;

-- Small covers are stored with their topic so replacement shares the topic transaction.
alter table public.learning_topics add column thumbnail_jpeg text
  check (thumbnail_jpeg is null or (
    octet_length(thumbnail_jpeg) <= 98304
    and thumbnail_jpeg ~ '^/9j/[A-Za-z0-9+/]*={0,2}$'
    and length(thumbnail_jpeg) % 4 = 0
  ));

grant insert (thumbnail_jpeg), update (thumbnail_jpeg) on public.learning_topics to authenticated;

commit;
