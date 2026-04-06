create table if not exists public.connection_probe (
  value text primary key
);

insert into public.connection_probe (value)
values ('connected')
on conflict (value) do nothing;
