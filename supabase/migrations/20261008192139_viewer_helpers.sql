-- Read helper for the web app (unlike latest_member_snapshots(), this one
-- is SECURITY INVOKER — the default — so it runs as the calling user and
-- stays subject to member_snapshots' and clan_members' RLS policies. It
-- only saves the client from re-deduplicating "last snapshot per member"
-- in JS; it grants no access beyond what those policies already allow.
create or replace function public.latest_member_snapshots_for_viewer(p_clan_id uuid)
returns table (
  clan_member_id uuid,
  donations integer,
  donations_received integer,
  exp_level integer,
  trophies integer,
  town_hall_level integer,
  league_name text,
  collected_at timestamptz
)
language sql
stable
as $$
  select distinct on (ms.clan_member_id)
    ms.clan_member_id,
    ms.donations,
    ms.donations_received,
    ms.exp_level,
    ms.trophies,
    ms.town_hall_level,
    ms.league_name,
    ms.collected_at
  from public.member_snapshots ms
  join public.clan_members cm on cm.id = ms.clan_member_id
  where cm.clan_id = p_clan_id
  order by ms.clan_member_id, ms.collected_at desc;
$$;

revoke all on function public.latest_member_snapshots_for_viewer(uuid) from public;
grant execute on function public.latest_member_snapshots_for_viewer(uuid) to authenticated;
