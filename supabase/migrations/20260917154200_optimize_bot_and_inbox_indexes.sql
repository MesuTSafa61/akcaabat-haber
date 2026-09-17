drop index if exists public.contact_messages_status_created_idx;

create index if not exists news_source_id_idx
  on public.news (source_id);

create index if not exists news_bot_items_news_id_idx
  on public.news_bot_items (news_id);

create index if not exists news_bot_items_run_id_idx
  on public.news_bot_items (run_id);
