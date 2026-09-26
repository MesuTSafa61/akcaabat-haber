-- Editörün bot haberinde özellikle seçtiği kaynak. NULL: henüz seçim yapılmadı;
-- boş metin: editör "Kaynak yok" seçti.
alter table public.news
  add column if not exists editor_source_name text;
