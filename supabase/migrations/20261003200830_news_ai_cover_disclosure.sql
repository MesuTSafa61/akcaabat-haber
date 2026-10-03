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
 (case when j.generated_image_url like '%-photo-v2.png' then '<p><em>Haber kapağı: Kaynak fotoğrafı ve yapay zekâ başlığıyla hazırlanmıştır.</em></p>' else '<p><em>Temsili görsel: Yapay zekâ ile oluşturulmuştur.</em></p>' end) || content else content end,
 updated_at=now() where id=n.id;
 update public.news_ai_jobs set status='applied',updated_at=now() where id=p_job;
end;
$$;
revoke all on function public.apply_news_ai_job(uuid) from public,anon;
grant execute on function public.apply_news_ai_job(uuid) to authenticated;
