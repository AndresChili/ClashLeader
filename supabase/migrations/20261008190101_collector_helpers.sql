-- Read helper used only by the collector (service role, bypasses RLS).
-- Not exposed to anon/authenticated: there's nothing here they couldn't
-- already see through member_snapshots, but the collector is the only
-- caller so there's no reason to grant it further.
create or replace function public.latest_member_snapshots(p_clan_id uuid)
returns table (
  clan_member_id uuid,
  donations integer,
  donations_received integer,
  collected_at timestamptz
)
language sql
stable
as $$
  select distinct on (ms.clan_member_id)
    ms.clan_member_id,
    ms.donations,
    ms.donations_received,
    ms.collected_at
  from public.member_snapshots ms
  join public.clan_members cm on cm.id = ms.clan_member_id
  where cm.clan_id = p_clan_id
  order by ms.clan_member_id, ms.collected_at desc;
$$;
