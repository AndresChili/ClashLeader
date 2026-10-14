-- Helper de lectura para la app web (a diferencia de
-- latest_member_snapshots(), esta es SECURITY INVOKER — el valor por
-- defecto — así que corre como el usuario que llama y sigue sujeta a las
-- políticas de RLS de member_snapshots y clan_members. Solo le ahorra al
-- cliente tener que deduplicar "último snapshot por miembro" en JS; no da
-- más acceso del que esas políticas ya permiten.
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
