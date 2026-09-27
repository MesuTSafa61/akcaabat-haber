alter table public.news
  add column if not exists photo_gallery_id uuid references public.media_galleries(id) on delete set null,
  add column if not exists video_gallery_id uuid references public.media_galleries(id) on delete set null;

create index if not exists news_photo_gallery_idx on public.news (photo_gallery_id)
  where photo_gallery_id is not null;
create index if not exists news_video_gallery_idx on public.news (video_gallery_id)
  where video_gallery_id is not null;
