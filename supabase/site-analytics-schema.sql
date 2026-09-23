-- Akçaabat Haber: anonim, günlük ziyaret istatistikleri.
-- IP, kullanıcı kimliği, cihaz bilgisi veya tam URL sorgu parametreleri tutulmaz.
create table if not exists public.site_visit_sessions (
  visit_day date not null,
  visitor_id uuid not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  page_views integer not null default 0 check (page_views >= 0),
  last_page text not null,
  primary key (visit_day, visitor_id)
);

create index if not exists site_visit_sessions_recent_idx
  on public.site_visit_sessions (last_seen desc);

create table if not exists public.site_visit_daily_pages (
  visit_day date not null,
  page text not null,
  views bigint not null default 0 check (views >= 0),
  primary key (visit_day, page)
);

alter table public.site_visit_sessions enable row level security;
alter table public.site_visit_daily_pages enable row level security;
revoke all on public.site_visit_sessions from public, anon, authenticated;
revoke all on public.site_visit_daily_pages from public, anon, authenticated;

create or replace function public.record_site_visit(
  p_visitor_id uuid, p_path text, p_pageview boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date;
  v_now timestamptz := clock_timestamp();
begin
  -- Yalnızca bilinen herkese açık sayfa adları; URL parametreleri kaydedilmez.
  if p_visitor_id is null or p_path not in (
    '/index.html', '/haber.html', '/haber-detay.html', '/kategori.html',
    '/arama.html', '/mac-merkezi.html', '/kameralar.html', '/trafik.html',
    '/hava-durumu.html', '/canli.html', '/yazarlar.html', '/reklam.html',
    '/iletisim.html', '/sorun-bildir.html', '/hakkimizda.html',
    '/kunye.html', '/gizlilik.html', '/kvkk.html', '/cerez-politikasi.html',
    '/basin-ilkeleri.html', '/etik-ilkeler.html', '/sorumlu-yayincilik.html'
  ) then
    return;
  end if;

  insert into public.site_visit_sessions
    (visit_day, visitor_id, first_seen, last_seen, page_views, last_page)
  values
    (v_day, p_visitor_id, v_now, v_now, case when p_pageview then 1 else 0 end, p_path)
  on conflict (visit_day, visitor_id) do update
    set last_seen = excluded.last_seen,
        last_page = excluded.last_page,
        page_views = public.site_visit_sessions.page_views + excluded.page_views;

  if p_pageview then
    insert into public.site_visit_daily_pages (visit_day, page, views)
    values (v_day, p_path, 1)
    on conflict (visit_day, page) do update
      set views = public.site_visit_daily_pages.views + 1;
  end if;
end;
$$;

revoke execute on function public.record_site_visit(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.record_site_visit(uuid,text,boolean) to anon, authenticated;

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
    'todayVisitors', (select count(*) from public.site_visit_sessions where visit_day = v_day),
    'yesterdayVisitors', (select count(*) from public.site_visit_sessions where visit_day = v_day - 1),
    'activeVisitors', (select count(*) from public.site_visit_sessions where last_seen >= now() - interval '5 minutes'),
    'todayPageViews', (select coalesce(sum(page_views), 0) from public.site_visit_sessions where visit_day = v_day),
    'lastSevenDays', (
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'visitors', coalesce(t.visitors, 0),
          'views', coalesce(t.views, 0)
        ) order by d.day
      )
      from pg_catalog.generate_series(v_day - 6, v_day, interval '1 day') as d(day)
      left join lateral (
        select count(*) as visitors, coalesce(sum(s.page_views), 0) as views
        from public.site_visit_sessions s where s.visit_day = d.day::date
      ) t on true
    ),
    'topPages', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('page', p.page, 'views', p.views)), '[]'::jsonb)
      from (
        select page, sum(views) as views
        from public.site_visit_daily_pages
        where visit_day = v_day
        group by page order by views desc limit 5
      ) p
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.site_analytics_summary() from public, anon, authenticated;
grant execute on function public.site_analytics_summary() to authenticated;

-- 90 günlük saklama süresi, UTC 01:30'da çalışır.
select cron.schedule(
  'site-analytics-90-day-retention', '30 1 * * *',
  $$delete from public.site_visit_sessions where visit_day < (now() at time zone 'Europe/Istanbul')::date - 90;
    delete from public.site_visit_daily_pages where visit_day < (now() at time zone 'Europe/Istanbul')::date - 90;$$
);
