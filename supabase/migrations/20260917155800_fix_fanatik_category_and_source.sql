update public.news
set category_id = (
      select id
      from public.categories
      where slug = 'trabzonspor'
        and is_active is true
      limit 1
    ),
    source_name = 'Fanatik',
    updated_at = now()
where source_id in (
  select id
  from public.news_sources
  where feed_url ilike '%fanatik.com.tr%'
);
