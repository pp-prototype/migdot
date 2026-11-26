insert into public.app_modules (module_id) values ('resolve-launch')
on conflict (module_id) do nothing;
