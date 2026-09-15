-- These functions are not called by the application or database policies.
revoke execute on function public.is_active_user() from authenticated;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from authenticated;
