update public.news_sources
set
  feed_url = 'https://www.fanatik.com.tr/takim/trabzonspor/futbol/',
  trust_level = 4,
  auto_publish = true,
  updated_at = now()
where name = 'Fanatik Trabzonspor';
