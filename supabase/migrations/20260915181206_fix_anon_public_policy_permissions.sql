-- Keep anonymous reads independent from staff-only helper functions.
-- The previous combined policies caused a permission error before anonymous
-- visitors could read active categories or approved comments.

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read_anon
on public.categories for select to anon
using (is_active = true);
create policy categories_public_read_authenticated
on public.categories for select to authenticated
using (is_active = true or (select public.is_editor_or_admin()));

drop policy if exists comments_public_read on public.comments;
create policy comments_public_read_anon
on public.comments for select to anon
using (status = 'approved');
create policy comments_public_read_authenticated
on public.comments for select to authenticated
using (status = 'approved' or (select public.is_editor_or_admin()));
