alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'editor', 'moderator', 'writer', 'reporter'));

create or replace function public.is_comment_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and role in ('admin', 'editor', 'moderator')
  );
$$;

revoke execute on function public.is_comment_moderator() from public, anon;
grant execute on function public.is_comment_moderator() to authenticated, service_role;

drop policy if exists comments_public_read_authenticated on public.comments;
create policy comments_public_read_authenticated
on public.comments
for select
to authenticated
using (status = 'approved' or (select public.is_comment_moderator()));

drop policy if exists comments_staff_update on public.comments;
create policy comments_staff_update
on public.comments
for update
to authenticated
using ((select public.is_comment_moderator()))
with check ((select public.is_comment_moderator()));

drop policy if exists comments_staff_delete on public.comments;
create policy comments_staff_delete
on public.comments
for delete
to authenticated
using ((select public.is_comment_moderator()));

create or replace function public.admin_list_staff_profiles()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekli.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at asc;
end;
$$;

revoke execute on function public.admin_list_staff_profiles() from public, anon;
grant execute on function public.admin_list_staff_profiles() to authenticated, service_role;

create or replace function public.admin_update_staff_profile(
  p_user_id uuid,
  p_display_name text,
  p_role text,
  p_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.profiles;
  v_updated public.profiles;
  v_active_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekli.' using errcode = '42501';
  end if;

  if p_role not in ('admin', 'editor', 'moderator', 'writer', 'reporter') then
    raise exception 'Geçersiz kullanıcı rolü.' using errcode = '22023';
  end if;

  select * into v_current
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Kullanıcı profili bulunamadı.' using errcode = 'P0002';
  end if;

  if p_user_id = (select auth.uid()) and (p_role <> 'admin' or not p_is_active) then
    raise exception 'Kendi yönetici hesabınızı pasifleştiremez veya yetkisini düşüremezsiniz.' using errcode = '42501';
  end if;

  if v_current.role = 'admin' and v_current.is_active and (p_role <> 'admin' or not p_is_active) then
    select count(*) into v_active_admin_count
    from public.profiles
    where role = 'admin' and is_active = true;

    if v_active_admin_count <= 1 then
      raise exception 'Sistemde en az bir aktif yönetici bulunmalıdır.' using errcode = '23514';
    end if;
  end if;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    role = p_role,
    is_active = p_is_active,
    updated_at = now()
  where id = p_user_id
  returning * into v_updated;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    (select auth.uid()),
    'staff_profile_updated',
    'profile',
    p_user_id,
    jsonb_build_object(
      'old_role', v_current.role,
      'new_role', p_role,
      'old_active', v_current.is_active,
      'new_active', p_is_active
    )
  );

  return v_updated;
end;
$$;

revoke execute on function public.admin_update_staff_profile(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_update_staff_profile(uuid, text, text, boolean) to authenticated, service_role;

update public.site_settings
set
  value = jsonb_set(
    coalesce(value, '{}'::jsonb),
    '{brandLogoUrl}',
    to_jsonb('assets/akcaabat-haber-logo-final-v2.png?v=2'::text),
    true
  ),
  updated_at = now()
where key = 'site'
  and not coalesce(value, '{}'::jsonb) ? 'brandLogoUrl';
