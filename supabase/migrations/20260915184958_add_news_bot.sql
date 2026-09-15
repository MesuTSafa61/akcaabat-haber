alter table public.news
  add column if not exists origin_type text not null default 'manual'
    check (origin_type in ('manual', 'automated')),
  add column if not exists source_id uuid,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_guid text,
  add column if not exists source_published_at timestamptz,
  add column if not exists source_summary text,
  add column if not exists source_fingerprint text,
  add column if not exists imported_at timestamptz;

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  feed_url text not null unique check (feed_url ~ '^https://'),
  source_type text not null default 'rss' check (source_type in ('rss', 'api')),
  category text not null check (category in ('akcaabat', 'trabzon', 'trabzonspor')),
  is_active boolean not null default true,
  trust_level smallint not null default 3 check (trust_level between 1 and 5),
  auto_publish boolean not null default false,
  allow_remote_image boolean not null default false,
  last_guid text,
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news
  drop constraint if exists news_source_id_fkey,
  add constraint news_source_id_fkey
    foreign key (source_id) references public.news_sources(id) on delete set null;

create table if not exists public.news_bot_settings (
  id boolean primary key default true check (id),
  is_enabled boolean not null default true,
  default_mode text not null default 'draft' check (default_mode in ('draft', 'auto_publish')),
  keywords jsonb not null default '{"akcaabat":["Akçaabat","Söğütlü","Yıldızlı","Darıca","Akçaabat Belediyesi"],"trabzon":["Trabzon","Trabzon Büyükşehir Belediyesi","Ortahisar","hava durumu","afet","turizm"],"trabzonspor":["Trabzonspor","Bordo Mavili","Şenol Güneş Spor Kompleksi"]}'::jsonb,
  last_run_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.news_bot_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed', 'disabled')),
  sources_checked integer not null default 0,
  found_count integer not null default 0,
  skipped_count integer not null default 0,
  duplicate_count integer not null default 0,
  draft_count integer not null default 0,
  published_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.news_bot_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources(id) on delete cascade,
  run_id uuid references public.news_bot_runs(id) on delete set null,
  source_guid text,
  source_url text,
  fingerprint text not null,
  title text not null,
  summary text,
  scope text not null check (scope in ('akcaabat', 'trabzon', 'trabzonspor')),
  tags text[] not null default '{}',
  remote_image_url text,
  source_published_at timestamptz,
  fetched_at timestamptz not null default now(),
  disposition text not null check (disposition in ('created', 'duplicate', 'filtered', 'error')),
  news_id uuid references public.news(id) on delete set null,
  unique (source_id, source_guid)
);

create unique index if not exists news_bot_items_url_unique
  on public.news_bot_items (source_url) where source_url is not null;
create unique index if not exists news_bot_items_fingerprint_unique
  on public.news_bot_items (fingerprint);
create unique index if not exists news_source_url_unique
  on public.news (source_url) where source_url is not null;
create index if not exists news_bot_runs_started_at_idx
  on public.news_bot_runs (started_at desc);
create index if not exists news_bot_items_source_fetched_idx
  on public.news_bot_items (source_id, fetched_at desc);

insert into public.news_bot_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.news_sources enable row level security;
alter table public.news_bot_settings enable row level security;
alter table public.news_bot_runs enable row level security;
alter table public.news_bot_items enable row level security;

grant select, insert, update, delete on public.news_sources, public.news_bot_settings, public.news_bot_runs, public.news_bot_items to authenticated;

create policy news_sources_staff_manage on public.news_sources
  for all to authenticated
  using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));
create policy news_bot_settings_staff_manage on public.news_bot_settings
  for all to authenticated
  using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));
create policy news_bot_runs_staff_read on public.news_bot_runs
  for select to authenticated
  using ((select public.is_editor_or_admin()));
create policy news_bot_items_staff_read on public.news_bot_items
  for select to authenticated
  using ((select public.is_editor_or_admin()));

create or replace function public.is_news_bot_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, vault
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'akcaabat_haber_news_bot_secret'
      and decrypted_secret = p_secret
  );
$$;

revoke execute on function public.is_news_bot_cron_secret(text) from public, anon, authenticated;
grant execute on function public.is_news_bot_cron_secret(text) to service_role;

select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'akcaabat_haber_news_bot_secret'
)
where not exists (
  select 1 from vault.secrets where name = 'akcaabat_haber_news_bot_secret'
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'akcaabat-haber-news-bot';

select cron.schedule(
  'akcaabat-haber-news-bot',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://wokgvwffbootbhqxfttm.supabase.co/functions/v1/news-bot?secret=' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'akcaabat_haber_news_bot_secret' limit 1),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
