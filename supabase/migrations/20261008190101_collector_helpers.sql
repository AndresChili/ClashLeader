-- Helper de lectura que solo usa el recolector (clave de servicio, se
-- salta RLS). No se expone a anon/authenticated: no hay nada aquí que no
-- pudieran ya ver a través de member_snapshots, pero el recolector es el
-- único que la llama, así que no hay razón para concederla más.
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
