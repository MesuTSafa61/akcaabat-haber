# Supabase deployment

The frontend uses the publishable key in `supabase-config.js`; it is intentionally safe to expose. Do not add a service-role key to this repository or to browser code.

The connected `akcaabat-haber` Supabase project already contains the production CMS schema, Storage bucket, Auth profile roles and RLS policies. This revision adds only the focused RLS repair in `supabase/migrations/20260915181206_fix_anon_public_policy_permissions.sql`; it has already been applied to the connected project. It separates anonymous public reads from staff-only helper functions without duplicating the existing schema.

Before publishing, verify that the editorial user's `public.profiles` row has an active `admin` or `editor` role. The browser client then has access only through the existing RLS policies: published news, active categories, approved comments and match data are public; administrative operations require an editorial session.
