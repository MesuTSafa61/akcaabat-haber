-- source_name: botun haberi aldığı yayın veya editörün seçtiği kaynak.
-- credited_source_name: kaynak yayının haber üzerinde açıkça belirttiği asıl kaynak.
alter table public.news
  add column if not exists credited_source_name text;

comment on column public.news.credited_source_name is
  'Kaynak yayında açıkça belirtilen ajans veya özgün kaynak; yoksa boş bırakılır.';
