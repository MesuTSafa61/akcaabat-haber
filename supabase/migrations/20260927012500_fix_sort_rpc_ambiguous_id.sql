create or replace function public.reorder_breaking_news(p_news_ids uuid[])
returns void language plpgsql set search_path = '' as $$
declare total integer; v_news_id uuid; position integer := 0;
begin
  if not public.is_editor_or_admin() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(89230, 11);
  select count(*) into total from public.news where status = 'published' and is_breaking = true;
  if p_news_ids is null or pg_catalog.cardinality(p_news_ids) <> total or
    exists (select 1 from pg_catalog.unnest(p_news_ids) x
      where x is null or not exists (select 1 from public.news where id = x and status = 'published' and is_breaking = true)) or
    (select count(distinct x) from pg_catalog.unnest(p_news_ids) x) <> total then
    raise exception 'Son dakika listesi değişti; sayfayı yenileyin.' using errcode = '22023';
  end if;
  foreach v_news_id in array p_news_ids loop
    position := position + 1;
    update public.news set breaking_order = position where public.news.id = v_news_id;
  end loop;
end;
$$;

create or replace function public.reorder_news_headlines(p_news_ids uuid[])
returns void language plpgsql set search_path = '' as $$
declare total integer; v_news_id uuid; position integer := 0;
begin
  if not public.is_editor_or_admin() then raise exception 'Yetkiniz yok.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(89230, 10);
  select count(*) into total from public.news where is_headline = true and headline_order between 1 and 15;
  if p_news_ids is null or pg_catalog.cardinality(p_news_ids) <> total or total > 15 or
    exists (select 1 from pg_catalog.unnest(p_news_ids) x
      where x is null or not exists (select 1 from public.news where id = x and is_headline = true and status = 'published')) or
    (select count(distinct x) from pg_catalog.unnest(p_news_ids) x) <> total then
    raise exception 'Manşet listesi değişti; sayfayı yenileyin.' using errcode = '22023';
  end if;
  update public.news set is_headline = false, headline_order = null where is_headline = true;
  foreach v_news_id in array p_news_ids loop
    position := position + 1;
    update public.news set is_headline = true, headline_order = position where public.news.id = v_news_id;
  end loop;
end;
$$;
