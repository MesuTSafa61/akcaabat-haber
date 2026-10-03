alter table public.news_ai_jobs add column if not exists cover_placement text not null default 'auto' check (cover_placement in ('auto','left','right','bottom'));
