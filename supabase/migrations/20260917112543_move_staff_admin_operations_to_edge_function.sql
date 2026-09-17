drop policy if exists comments_public_read_authenticated on public.comments;
create policy comments_public_read_authenticated
on public.comments
for select
to authenticated
using (
  status = 'approved'
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'editor', 'moderator')
  )
);

drop policy if exists comments_staff_update on public.comments;
create policy comments_staff_update
on public.comments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'editor', 'moderator')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'editor', 'moderator')
  )
);

drop policy if exists comments_staff_delete on public.comments;
create policy comments_staff_delete
on public.comments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'editor', 'moderator')
  )
);

drop function if exists public.admin_list_staff_profiles();
drop function if exists public.admin_update_staff_profile(uuid, text, text, boolean);
drop function if exists public.is_comment_moderator();
