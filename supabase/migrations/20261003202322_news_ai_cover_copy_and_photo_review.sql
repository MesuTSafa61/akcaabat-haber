alter table public.news_ai_jobs add column if not exists cover_headline text;
alter table public.news_ai_jobs add column if not exists cover_subtitle text;
alter table public.news_ai_jobs add column if not exists clean_photo_url text;
alter table public.news_ai_jobs add column if not exists clean_photo_credit text;
alter table public.news_ai_jobs add column if not exists photo_search_status text not null default 'not_checked';
alter table public.news_ai_jobs add column if not exists photo_candidate_url text;
