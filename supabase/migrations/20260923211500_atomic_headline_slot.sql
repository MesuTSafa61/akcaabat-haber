-- Manşet değiştirme ve sıra taşıma işlemlerini tek veritabanı işleminde tamamla.
create or replace function public.set_news_headline_slot(p_order integer, p_news_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  updated_count integer;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Manşeti düzenleme yetkiniz yok.' using errcode = '42501';
  end if;

  if p_order is null or p_order not between 1 and 10 then
    raise exception 'Manşet sırası 1 ile 10 arasında olmalıdır.' using errcode = '22023';
  end if;

  -- İki yönetici aynı anda sıra değiştirirse işlemleri sıraya al.
  perform pg_catalog.pg_advisory_xact_lock(89230, 10);

  if p_news_id is not null and not exists (
    select 1 from public.news
    where id = p_news_id and status = 'published'
  ) then
    raise exception 'Yalnızca yayınlanmış haberler manşete alınabilir.' using errcode = '22023';
  end if;

  -- Hedefteki haberi ve seçilen haberin varsa önceki sırasını boşalt.
  update public.news
  set is_headline = false, headline_order = null, updated_at = now()
  where (is_headline = true and headline_order = p_order and id is distinct from p_news_id)
     or (id = p_news_id and is_headline = true and headline_order is distinct from p_order);

  if p_news_id is not null then
    update public.news
    set is_headline = true, headline_order = p_order, updated_at = now()
    where id = p_news_id and status = 'published';
    get diagnostics updated_count = row_count;
    if updated_count <> 1 then
      raise exception 'Haber manşete alınamadı.' using errcode = '42501';
    end if;
  end if;
end;
$function$;

revoke all on function public.set_news_headline_slot(integer, uuid) from public, anon;
grant execute on function public.set_news_headline_slot(integer, uuid) to authenticated;
