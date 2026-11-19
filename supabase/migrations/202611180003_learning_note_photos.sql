begin;

alter table public.learning_notes add column photo_jpeg text
  check (photo_jpeg is null or (
    octet_length(photo_jpeg) <= 196608
    and photo_jpeg ~ '^/9j/[A-Za-z0-9+/]*={0,2}$'
    and length(photo_jpeg) % 4 = 0
  ));

grant insert (photo_jpeg), update (photo_jpeg) on public.learning_notes to authenticated;

commit;
