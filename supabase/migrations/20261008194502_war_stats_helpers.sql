-- Estadísticas de guerra para la app web. Las dos son SECURITY INVOKER (el
-- valor por defecto) así que corren como quien llama y siguen sujetas a
-- RLS de wars/war_members/war_attacks — mismo razonamiento que
-- latest_member_snapshots_for_viewer().

-- Fiabilidad de todos los tiempos a través de cada guerra que este clan ha
-- terminado: se usa para ordenar "Alineación recomendada" y para rellenar
-- la línea "usa el X% · Y por ataque" de Miembros/Ficha.
create or replace function public.member_war_reliability(p_clan_id uuid)
returns table (
  clan_member_id uuid,
  player_tag text,
  wars_counted integer,
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

-- Las últimas N guerras terminadas de un miembro (la más reciente primero),
-- una fila por guerra con sus estrellas totales en esa guerra —
-- "Últimas 10 guerras" en la Ficha.
create or replace function public.member_recent_wars(p_clan_member_id uuid, p_limit integer default 10)
returns table (
  war_id uuid,
  end_time timestamptz,
  stars integer
)
language sql
stable
as $$
  select
    w.id as war_id,
    w.end_time,
    coalesce(sum(wa.stars), 0)::int as stars
  from public.war_members wm
  join public.wars w on w.id = wm.war_id
  left join public.war_attacks wa on wa.war_id = wm.war_id and wa.player_tag = wm.player_tag
  where wm.clan_member_id = p_clan_member_id and w.state = 'warEnded'
  group by w.id, w.end_time
  order by w.end_time desc
  limit p_limit;
$$;

revoke all on function public.member_recent_wars(uuid, integer) from public;
grant execute on function public.member_recent_wars(uuid, integer) to authenticated;
