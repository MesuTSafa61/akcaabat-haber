-- Atomic official sports snapshots; all writes are server-only.
alter table public.sports_standings add column if not exists is_manual boolean not null default false;
create table if not exists public.sports_feeds (
 team_id uuid primary key references public.sports_teams(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','running','completed','partial','failed')),
 last_attempt_at timestamptz,
 last_success_at timestamptz,
 error_summary text,
 lease_until timestamptz not null default '-infinity'
);
alter table public.sports_feeds enable row level security;
drop policy if exists sports_feeds_read on public.sports_feeds;
create policy sports_feeds_read on public.sports_feeds for select to anon,authenticated using(true);
grant select on public.sports_feeds to anon,authenticated;
grant all on public.sports_feeds to service_role;
insert into public.sports_feeds(team_id) select id from public.sports_teams where is_active on conflict do nothing;

create or replace function public.sports_sync_authorized(p_token text) returns boolean
language sql security definer set search_path='' as $$
 select coalesce((select (auth.jwt()->>'role')='service_role' and length(p_token)>20 and decrypted_secret=p_token
 from vault.decrypted_secrets where name='akcaabat_haber_sports_sync_secret'),false);
$$;
revoke all on function public.sports_sync_authorized(text) from public,anon,authenticated;
grant execute on function public.sports_sync_authorized(text) to service_role;

create or replace function public.sports_sync_claim(p_team uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 update public.sports_feeds set status='running',last_attempt_at=now(),lease_until=now()+interval '3 minutes'
 where team_id=p_team and lease_until<now();
 return found;
end $$;
revoke all on function public.sports_sync_claim(uuid) from public,anon,authenticated;
grant execute on function public.sports_sync_claim(uuid) to service_role;

create or replace function public.sports_sync_save(p_team uuid,p_data jsonb,p_error text default null) returns void
language plpgsql security invoker set search_path='' as $$
declare m jsonb; r jsonb; home boolean; source text; tracked_name text;
begin
 if jsonb_array_length(p_data->'matches')<10 or jsonb_array_length(p_data->'standings')<10 then raise exception 'Incomplete sports snapshot'; end if;
 source:=case when p_team='f9ccbebd-8724-4bb5-ab17-9b4e4cea49f7' then 'tff-official' else 'sebatspor-official' end;
 select name into tracked_name from public.sports_teams where id=p_team;
 for m in select value from jsonb_array_elements(p_data->'matches') loop
  if m->>'date' is null then continue; end if;
  home:=case when source='tff-official' then (m->>'home') ilike '%trabzonspor%' else (m->>'home') ilike '%sebat%' end;
  insert into public.sports_matches(team_id,opponent_name,opponent_logo_url,competition,venue,match_date,status,home_away,home_score,away_score,match_url,external_match_id,data_source)
  values(p_team,case when home then m->>'away' else m->>'home' end,case when home then m->>'away_logo' else m->>'home_logo' end,p_data->>'competition',m->>'venue',(m->>'date')::timestamptz,case when m->>'status' in ('live','finished','postponed','cancelled') then m->>'status' else 'scheduled' end,case when home then 'home' else 'away' end,(case when home then m->>'home_score' else m->>'away_score' end)::int,(case when home then m->>'away_score' else m->>'home_score' end)::int,m->>'url',m->>'id',source)
  on conflict(external_match_id) do update set opponent_name=excluded.opponent_name,opponent_logo_url=excluded.opponent_logo_url,competition=excluded.competition,venue=excluded.venue,match_date=excluded.match_date,status=excluded.status,home_away=excluded.home_away,home_score=excluded.home_score,away_score=excluded.away_score,match_url=excluded.match_url,updated_at=now()
  where public.sports_matches.data_source=excluded.data_source;
 end loop;
 -- Remove only malformed legacy IDs for the repaired source after a valid replacement.
 delete from public.sports_matches where team_id=p_team and data_source=source and external_match_id is not null
 and external_match_id !~ '^(tff|sebat):[0-9]+$';
 for r in select value from jsonb_array_elements(p_data->'standings') loop
  insert into public.sports_standings(team_id,competition,season,position,team_name,played,won,drawn,lost,goals_for,goals_against,goal_difference,points)
  values(p_team,p_data->>'competition',p_data->>'season',(r->>'position')::int,r->>'name',(r->>'played')::int,(r->>'won')::int,(r->>'drawn')::int,(r->>'lost')::int,(r->>'gf')::int,(r->>'ga')::int,(r->>'gd')::int,(r->>'points')::int)
  on conflict(team_id,competition,season,team_name) do update set position=excluded.position,played=excluded.played,won=excluded.won,drawn=excluded.drawn,lost=excluded.lost,goals_for=excluded.goals_for,goals_against=excluded.goals_against,goal_difference=excluded.goal_difference,points=excluded.points,updated_at=now() where not public.sports_standings.is_manual;
 end loop;
 update public.sports_feeds set data=p_data,status=case when p_error is null then 'completed' else 'partial' end,last_success_at=now(),error_summary=p_error,lease_until='-infinity' where team_id=p_team;
end $$;
revoke all on function public.sports_sync_save(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.sports_sync_save(uuid,jsonb,text) to service_role;
-- A league snapshot has one row for every club, not one row per followed club.
drop index if exists public.sports_standings_team_competition_season_uidx;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sports_feeds') then
  alter publication supabase_realtime add table public.sports_feeds;
 end if;
end $$;
-- Existing one-minute job; the secret stays in Vault, not the URL or repository.
select cron.alter_job(2,command := $job$select net.http_post(url:='https://wokgvwffbootbhqxfttm.supabase.co/functions/v1/sync-sports',headers:=jsonb_build_object('Content-Type','application/json','x-sync-secret',(select decrypted_secret from vault.decrypted_secrets where name='akcaabat_haber_sports_sync_secret')),body:='{}'::jsonb,timeout_milliseconds:=120000);$job$);
