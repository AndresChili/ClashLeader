-- Oro de capital aportado (donado a la capital del clan) por cada miembro.
--
-- La API solo da el total acumulado de por vida del jugador
-- (player.clanCapitalContributions), así que se guarda una fila cada vez
-- que ese total cambia y lo aportado en un periodo es la diferencia entre
-- el último valor y el que tenía al empezar el periodo. Va por episodio de
-- membresía (clan_member_id): quien sale y vuelve a entrar empieza de cero.
-- Solo hay datos desde que se empezó a guardar esto.

alter table public.clan_members
  add column capital_contributions bigint;

comment on column public.clan_members.capital_contributions is
  'Último total de por vida de oro aportado a la capital (player.clanCapitalContributions); el recolector lo compara para saber si guardar una fila nueva en capital_contribution_snapshots.';

create table public.capital_contribution_snapshots (
  id bigint generated always as identity primary key,
  clan_member_id uuid not null references public.clan_members (id) on delete cascade,
  value bigint not null,
  collected_at timestamptz not null default now()
);

create index capital_contribution_snapshots_member_idx
  on public.capital_contribution_snapshots (clan_member_id, collected_at desc);

alter table public.capital_contribution_snapshots enable row level security;
alter table public.capital_contribution_snapshots force row level security;

create policy "capital_contribution_snapshots_select_member" on public.capital_contribution_snapshots
  for select using (public.has_clan_access(public.clan_id_for_member(clan_member_id)));

-- Lo aportado por cada miembro actual desde p_since (null = desde que hay
-- datos). La base es el último valor anterior a p_since; si no hay
-- ninguno (empezó a seguirse después), el primero que se guardó.
create function public.member_capital_contributed(p_clan_id uuid, p_since timestamptz default null)
returns table (
  clan_member_id uuid,
  contributed bigint,
  tracked_since timestamptz
)
language sql
stable
as $$
  select
    cm.id as clan_member_id,
    greatest(latest.value - coalesce(before_since.value, first_row.value), 0) as contributed,
    first_row.collected_at as tracked_since
  from public.clan_members cm
  cross join lateral (
    select s.value from public.capital_contribution_snapshots s
    where s.clan_member_id = cm.id
    order by s.collected_at desc limit 1
  ) latest
  cross join lateral (
    select s.value, s.collected_at from public.capital_contribution_snapshots s
    where s.clan_member_id = cm.id
    order by s.collected_at asc limit 1
  ) first_row
  left join lateral (
    select s.value from public.capital_contribution_snapshots s
    where s.clan_member_id = cm.id and p_since is not null and s.collected_at <= p_since
    order by s.collected_at desc limit 1
  ) before_since on true
  where cm.clan_id = p_clan_id and cm.is_current;
$$;

revoke all on function public.member_capital_contributed(uuid, timestamptz) from public;
grant execute on function public.member_capital_contributed(uuid, timestamptz) to authenticated;

-- Asaltos de capital de cada miembro actual en los fines de semana que
-- empezaron desde p_since (null = todos). Solo cuentan los fines de semana
-- que terminaron después de que entrara (su episodio actual): quien sale
-- y vuelve a entrar empieza de cero. La API solo lista a quien atacó, así
-- que quien no aparece en un fin de semana cuenta como 0 de 6 ataques.
create function public.member_capital_raids(p_clan_id uuid, p_since timestamptz default null)
returns table (
  clan_member_id uuid,
  weekends integer,
  attacks_used integer,
  attacks_available integer,
  gold_looted bigint
)
language sql
stable
as $$
  select
    cm.id as clan_member_id,
    count(cs.id)::int as weekends,
    coalesce(sum(cc.attacks_used), 0)::int as attacks_used,
    sum(coalesce(cc.attack_limit, 6))::int as attacks_available,
    coalesce(sum(cc.capital_gold_looted), 0)::bigint as gold_looted
  from public.clan_members cm
  join public.capital_seasons cs
    on cs.clan_id = cm.clan_id
    and (cs.end_time is null or cs.end_time >= cm.first_seen_at)
    and (p_since is null or cs.start_time >= p_since)
  left join public.capital_contributions cc
    on cc.capital_season_id = cs.id and cc.player_tag = cm.player_tag
  where cm.clan_id = p_clan_id and cm.is_current
  group by cm.id;
$$;

revoke all on function public.member_capital_raids(uuid, timestamptz) from public;
grant execute on function public.member_capital_raids(uuid, timestamptz) to authenticated;
