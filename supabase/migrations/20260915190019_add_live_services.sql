create table public.live_cameras (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  city text not null check (city in ('Akçaabat', 'Trabzon')),
  district text,
  location text,
  stream_url text check (stream_url is null or stream_url ~ '^https://'),
  embed_url text check (embed_url is null or embed_url ~ '^https://'),
  source_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stream_url is not null or embed_url is not null)
);
create table public.live_service_settings (
  key text primary key check (key = 'traffic'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.live_service_settings (key, value)
values ('traffic', '{"enabled":false,"provider":"","public_map_url":"","cache_seconds":60}')
on conflict (key) do nothing;
create index live_cameras_active_sort_idx on public.live_cameras (city, sort_order, created_at) where is_active;
alter table public.live_cameras enable row level security;
alter table public.live_service_settings enable row level security;
grant select on public.live_cameras to anon, authenticated;
grant select, insert, update, delete on public.live_cameras, public.live_service_settings to authenticated;
create policy live_cameras_public_read on public.live_cameras for select to anon, authenticated using (is_active);
create policy live_cameras_staff_manage on public.live_cameras for all to authenticated using ((select public.is_editor_or_admin())) with check ((select public.is_editor_or_admin()));
create policy live_service_settings_staff_manage on public.live_service_settings for all to authenticated using ((select public.is_editor_or_admin())) with check ((select public.is_editor_or_admin()));
