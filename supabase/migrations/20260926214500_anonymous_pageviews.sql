-- Aggregate page views without a browser identifier or session record.
create or replace function public.record_anonymous_pageview(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if p_path not in (
    '/index.html', '/haber.html', '/haber-detay.html', '/kategori.html',
    '/arama.html', '/mac-merkezi.html', '/kameralar.html', '/trafik.html',
    '/hava-durumu.html', '/canli.html', '/yazarlar.html', '/reklam.html',
    '/iletisim.html', '/sorun-bildir.html', '/hakkimizda.html',
    '/kunye.html', '/gizlilik.html', '/kvkk.html', '/cerez-politikasi.html',
    '/basin-ilkeleri.html', '/etik-ilkeler.html', '/sorumlu-yayincilik.html'
  ) then return; end if;

  insert into public.site_visit_daily_pages (visit_day, page, views)
  values (v_day, p_path, 1)
  on conflict (visit_day, page) do update
    set views = public.site_visit_daily_pages.views + 1;
end;
$$;
revoke execute on function public.record_anonymous_pageview(text) from public, anon, authenticated;
grant execute on function public.record_anonymous_pageview(text) to anon, authenticated;

-- The previous session endpoint must not accept identifiers from stale clients.
revoke execute on function public.record_site_visit(uuid,text,boolean) from public, anon, authenticated;

create or replace function public.site_analytics_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date;
  v_result jsonb;
begin
  if not public.is_editor_or_admin() then
    raise exception 'İstatistikleri görüntüleme yetkisi gerekli.' using errcode = '42501';
  end if;

  select pg_catalog.jsonb_build_object(
    'todayPageViews', (select coalesce(sum(views), 0) from public.site_visit_daily_pages where visit_day = v_day),
    'yesterdayPageViews', (select coalesce(sum(views), 0) from public.site_visit_daily_pages where visit_day = v_day - 1),
    'lastSevenDays', (
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'), 'views', coalesce(t.views, 0)
      ) order by d.day)
      from pg_catalog.generate_series(v_day - 6, v_day, interval '1 day') as d(day)
      left join lateral (
        select coalesce(sum(p.views), 0) as views
        from public.site_visit_daily_pages p where p.visit_day = d.day::date
      ) t on true
    ),
    'topPages', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('page', p.page, 'views', p.views)), '[]'::jsonb)
      from (
        select page, sum(views) as views from public.site_visit_daily_pages
        where visit_day = v_day group by page order by views desc limit 5
      ) p
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.site_analytics_summary() from public, anon, authenticated;
grant execute on function public.site_analytics_summary() to authenticated;
