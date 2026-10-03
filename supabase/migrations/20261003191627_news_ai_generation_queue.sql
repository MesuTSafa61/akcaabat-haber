alter table public.news_bot_settings add column if not exists ai_enabled boolean not null default false;
alter table public.news_bot_settings add column if not exists ai_titles boolean not null default true;
alter table public.news_bot_settings add column if not exists ai_images boolean not null default true;
create table if not exists public.news_ai_jobs (
 id uuid primary key default gen_random_uuid(),
 news_id uuid not null unique references public.news(id) on delete cascade,
 original_title text not null,
 original_summary text not null,
 original_image_url text,
 wants_title boolean not null default true,
 wants_image boolean not null default true,
 status text not null default 'queued' check(status in ('queued','text_wait','image_start','image_wait','ready','applied','failed')),
 title_suggestion text,
 image_prompt text,
 generated_image_url text,
 text_request_id text,
 image_request_id text,
 provider_model text,
 error_message text,
 attempts integer not null default 0,
 next_at timestamptz not null default now(),
 leased_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.news_ai_jobs enable row level security;
revoke all on public.news_ai_jobs from anon;
grant select,update on public.news_ai_jobs to authenticated;
grant all on public.news_ai_jobs to service_role;
create policy news_ai_staff_read on public.news_ai_jobs for select to authenticated using(public.is_admin_or_editor());
create policy news_ai_staff_update on public.news_ai_jobs for update to authenticated using(public.is_admin_or_editor()) with check(public.is_admin_or_editor());
create index news_ai_queue_idx on public.news_ai_jobs(next_at) where status in ('queued','text_wait','image_start','image_wait');
create or replace function public.claim_news_ai_jobs() returns setof public.news_ai_jobs
language sql security invoker set search_path='' as $$
 update public.news_ai_jobs set leased_until=now()+interval '2 minutes'
 where id in (
 select id from public.news_ai_jobs where status in ('queued','text_wait','image_start','image_wait')
 and next_at <= now() and (leased_until is null or leased_until < now())
 order by next_at,created_at limit 3 for update skip locked
 ) returning *;
$$;
revoke all on function public.claim_news_ai_jobs() from public,anon,authenticated;
grant execute on function public.claim_news_ai_jobs() to service_role;
create or replace function public.apply_news_ai_job(p_job uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare j public.news_ai_jobs; n public.news;
begin
 if not public.is_admin_or_editor() then raise exception 'Yetkisiz istek'; end if;
 select * into j from public.news_ai_jobs where id=p_job for update;
 if j.id is null or j.status<>'ready' then raise exception 'Uretim hazir degil'; end if;
 select * into n from public.news where id=j.news_id for update;
 if n.status<>'draft' then raise exception 'Yalnizca taslaga uygulanabilir'; end if;
 if n.title is distinct from j.original_title or n.image_url is distinct from j.original_image_url then
 raise exception 'Haber duzenlenmis; oneriyi yeni haber ekraninda kontrol edin';
 end if;
 update public.news set
 title=case when j.wants_title then coalesce(j.title_suggestion,title) else title end,
 image_url=case when j.wants_image then coalesce(j.generated_image_url,image_url) else image_url end,
 content=case when j.wants_image and j.generated_image_url is not null then
 '<p><em>Temsili görsel: Yapay zekâ ile oluşturulmuştur.</em></p>' || content else content end,
 updated_at=now() where id=n.id;
 update public.news_ai_jobs set status='applied',updated_at=now() where id=p_job;
end;
$$;
revoke all on function public.apply_news_ai_job(uuid) from public,anon;
grant execute on function public.apply_news_ai_job(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('news-ai-images','news-ai-images',true,5242880,array['image/webp','image/png','image/jpeg'])
on conflict(id) do nothing;
