grant select on public.live_service_settings to anon;
create policy live_service_settings_public_read on public.live_service_settings
  for select to anon, authenticated using (true);
