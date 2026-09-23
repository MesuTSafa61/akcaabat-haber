-- Manşet kapasitesini 15'e çıkar; ekleme sırasında mevcut haberleri kaydır.
alter table public.news drop constraint if exists news_headline_order_check;
alter table public.news add constraint news_headline_order_check
  check (headline_order is null or headline_order between 1 and 15);

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
  if p_order is null or p_order not between 1 and 15 then
    raise exception 'Manşet sırası 1 ile 15 arasında olmalıdır.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(89230, 10);
  if p_news_id is not null and not exists (
    select 1 from public.news where id = p_news_id and status = 'published'
  ) then
    raise exception 'Yalnızca yayınlanmış haberler manşete alınabilir.' using errcode = '22023';
  end if;

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

-- Yeni haber editöründe sıra seçimi, dolu manşetleri bir ileriye kaydırır.
create function public.insert_news_headline_slot(p_order integer, p_news_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  slots uuid[] := pg_catalog.array_fill(null::uuid, array[15]);
  current_slot record;
  previous_order integer;
  slot_number integer;
  updated_count integer;
begin
  if not public.is_editor_or_admin() then
    raise exception 'Manşeti düzenleme yetkiniz yok.' using errcode = '42501';
  end if;
  if p_order is null or p_order not between 1 and 15 or p_news_id is null then
    raise exception 'Geçerli bir haber ve 1 ile 15 arasında sıra seçin.' using errcode = '22023';
  end if;

  -- Sıra düzenleyicisiyle eşzamanlı değişiklikler aynı kilidi kullanır.
  perform pg_catalog.pg_advisory_xact_lock(89230, 10);
  select headline_order into previous_order from public.news
    where id = p_news_id and status = 'published';
  if not found then
    raise exception 'Yalnızca yayınlanmış haberler manşete alınabilir.' using errcode = '22023';
  end if;

  for current_slot in
    select id, headline_order from public.news
    where is_headline = true and headline_order between 1 and 15
  loop
    slots[current_slot.headline_order] := current_slot.id;
  end loop;

  -- Haber önceden manşetteyse eski konumunu kapat; yer değiştirmede haber kaybetme.
  if previous_order between 1 and 15 and slots[previous_order] = p_news_id then
    for slot_number in previous_order..14 loop
      slots[slot_number] := slots[slot_number + 1];
    end loop;
    slots[15] := null;
  end if;

  for slot_number in reverse 15..(p_order + 1) loop
    slots[slot_number] := slots[slot_number - 1];
  end loop;
  slots[p_order] := p_news_id;

  -- Önce tüm dolu sıraları boşalt; benzersiz sıra kuralı ara adımları engellemez.
  update public.news set is_headline = false, headline_order = null, updated_at = now()
    where is_headline = true;

  for slot_number in 1..15 loop
    if slots[slot_number] is not null then
      update public.news
      set is_headline = true, headline_order = slot_number, updated_at = now()
      where id = slots[slot_number] and status = 'published';
      get diagnostics updated_count = row_count;
      if updated_count <> 1 then
        raise exception 'Manşet güncellenemedi; işlem geri alındı.' using errcode = '42501';
      end if;
    end if;
  end loop;
end;
$function$;

revoke all on function public.insert_news_headline_slot(integer, uuid) from public, anon;
grant execute on function public.insert_news_headline_slot(integer, uuid) to authenticated;
