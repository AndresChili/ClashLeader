-- Añade wars_attacked (recuento de guerras terminadas en las que el
-- miembro hizo al menos un ataque) a member_war_reliability(), necesario
-- para "Candidato a veterano" (atacó en todas sus guerras — presencia, no
-- volumen, que es lo que usage_pct ya mide). La forma del resultado
-- cambia, así que hay que borrar primero la función vieja: CREATE OR
-- REPLACE no puede alterar el tipo de fila de los parámetros OUT de una
-- función existente.
drop function if exists public.member_war_reliability(uuid);

create function public.member_war_reliability(p_clan_id uuid)
returns table (
  clan_member_id uuid,
  player_tag text,
  wars_counted integer,
  wars_attacked integer,
  attacks_used integer,
  attacks_available integer,
  usage_pct numeric,
  avg_stars numeric
)
language sql
stable
as $$
  select
    wm.clan_member_id,
    wm.player_tag,
    count(distinct wm.war_id)::int as wars_counted,
    count(distinct wm.war_id) filter (where wm.attacks_used > 0)::int as wars_attacked,
    sum(wm.attacks_used)::int as attacks_used,
    sum(case when w.war_type = 'cwl' then 1 else 2 end)::int as attacks_available,
    round(100.0 * sum(wm.attacks_used) / nullif(sum(case when w.war_type = 'cwl' then 1 else 2 end), 0), 0) as usage_pct,
    round(avg(wa.stars), 2) as avg_stars
  from public.war_members wm
  join public.wars w on w.id = wm.war_id
  left join public.war_attacks wa on wa.war_id = wm.war_id and wa.player_tag = wm.player_tag
  where w.clan_id = p_clan_id and w.state = 'warEnded' and wm.clan_member_id is not null
  group by wm.clan_member_id, wm.player_tag;
$$;

revoke all on function public.member_war_reliability(uuid) from public;
grant execute on function public.member_war_reliability(uuid) to authenticated;
