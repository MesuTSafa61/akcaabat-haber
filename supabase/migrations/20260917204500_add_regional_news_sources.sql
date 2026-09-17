insert into public.news_sources
  (name, feed_url, source_type, category, is_active, trust_level, auto_publish, allow_remote_image)
values
  ('61Saat', 'https://www.61saat.com/rss', 'rss', 'trabzon', true, 4, true, true),
  ('Haber61', 'https://www.haber61.net/rss', 'rss', 'trabzon', true, 4, true, true),
  ('Kuzey Ekspres', 'https://www.kuzeyekspres.com.tr/rss', 'rss', 'trabzon', true, 4, true, true),
  ('Taka Gazete', 'https://www.takagazete.com.tr/rss', 'rss', 'trabzon', true, 3, false, true),
  ('Günebakış', 'https://www.gunebakis.com.tr/rss', 'rss', 'trabzon', true, 4, true, true),
  ('Yeni Şafak', 'https://www.yenisafak.com/rss?xml=spor', 'rss', 'trabzonspor', true, 3, false, true),
  ('Haberler.com', 'https://rss.haberler.com/rss.asp', 'rss', 'trabzon', true, 3, false, true),
  ('DHA Akçaabat', 'https://www.dha.com.tr/haberleri/akcaabat', 'rss', 'akcaabat', true, 4, true, true),
  ('DHA Trabzonspor', 'https://www.dha.com.tr/haberleri/trabzonspor', 'rss', 'trabzonspor', true, 4, true, true),
  ('İHA', 'https://www.iha.com.tr/trabzon-haberleri', 'rss', 'trabzon', false, 3, false, true)
on conflict (feed_url) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  category = excluded.category,
  is_active = excluded.is_active,
  trust_level = excluded.trust_level,
  auto_publish = excluded.auto_publish,
  allow_remote_image = excluded.allow_remote_image,
  updated_at = now();

update public.news_bot_settings
set keywords = jsonb_build_object(
  'akcaabat', jsonb_build_array(
    'Akçaabat', 'Söğütlü', 'Yıldızlı', 'Darıca', 'Akçaabat Belediyesi',
    'Sebat', 'Sebat Gençlik', 'Akçaabat Sebatspor', 'Akçaabat Sebat Gençlik'
  ),
  'trabzon', jsonb_build_array(
    'Trabzon', 'Trabzon Büyükşehir Belediyesi', 'Ortahisar', 'hava durumu',
    'afet', 'turizm', 'Karadeniz Teknik Üniversitesi', 'KTÜ'
  ),
  'trabzonspor', jsonb_build_array(
    'Trabzonspor', 'Bordo Mavili', 'Bordo-Mavili', 'Şenol Güneş Spor Kompleksi',
    'Papara Park', 'Mehmet Ali Yılmaz Tesisleri'
  )
), updated_at = now()
where id = true;
