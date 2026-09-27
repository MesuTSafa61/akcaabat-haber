create table if not exists public.media_galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 180),
  description text not null default '',
  kind text not null check (kind in ('photo', 'video')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  cover_url text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_galleries_public_idx
  on public.media_galleries (kind, updated_at desc) where status = 'published';

alter table public.media_galleries enable row level security;

create policy "Published galleries are public" on public.media_galleries
  for select to anon, authenticated using (status = 'published');
create policy "Editors can read galleries" on public.media_galleries
  for select to authenticated using ((select public.is_admin_or_editor()));
create policy "Editors can create galleries" on public.media_galleries
  for insert to authenticated with check ((select public.is_admin_or_editor()));
create policy "Editors can update galleries" on public.media_galleries
  for update to authenticated using ((select public.is_admin_or_editor()))
  with check ((select public.is_admin_or_editor()));
create policy "Editors can delete galleries" on public.media_galleries
  for delete to authenticated using ((select public.is_admin_or_editor()));

grant select on public.media_galleries to anon, authenticated;
grant insert, update, delete on public.media_galleries to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-galleries', 'media-galleries', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy "Editors upload gallery media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media-galleries' and (select public.is_admin_or_editor()));
create policy "Editors delete gallery media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media-galleries' and (select public.is_admin_or_editor()));
