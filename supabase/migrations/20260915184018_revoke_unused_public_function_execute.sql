-- Keep internal helper functions out of the public RPC surface.
revoke execute on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

revoke execute on function public.log_audit(text, text, uuid, jsonb) from public;
