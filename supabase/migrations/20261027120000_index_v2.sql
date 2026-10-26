-- Índice v2 (ver packages/rules/src/index-score.ts):
--
-- 1. Nuevo peso "actividad" y reparto nuevo: guerra 45, actividad 25,
--    capital 15, juegos 10, donaciones 5. Las donaciones pesaban 30 y no
--    reflejan tanto el compromiso con el clan. Se aplica también a los
--    clanes ya existentes: hasta ahora nadie podía editar los pesos desde
--    la app, así que todos tienen los valores por defecto antiguos.
-- 2. Fuera index_pass_threshold: el veredicto Cumple/Flojo pasa a tramos
--    fijos (Excelente, Genial, Bien, Suficiente, Flojo, Muy flojo, Expulsar).
-- 3. member_war_reliability() contaba doble: el join con war_attacks
--    repetía la fila de war_members por cada ataque, así que un miembro con
--    2 ataques en una guerra sumaba attacks_used 4 / disponibles 4, y al
--    mezclarlo con guerras sin ataques el % de uso salía inflado (2 de 4 en
--    dos guerras daba 67 % en vez de 50 %). Ahora se agrega por guerra antes
--    de sumar. Además acepta p_last_n para mirar solo las últimas N guerras
--    en las que el miembro estuvo en la alineación.

alter table public.clan_rules drop constraint clan_rules_weights_sum_100;

alter table public.clan_rules
  add column index_weight_activity integer not null default 25;

alter table public.clan_rules
  alter column index_weight_war set default 45,
  alter column index_weight_donations set default 5,
  alter column index_weight_capital set default 15,
  alter column index_weight_games set default 10;

update public.clan_rules
set index_weight_war = 45,
    index_weight_activity = 25,
    index_weight_capital = 15,
    index_weight_games = 10,
    index_weight_donations = 5;

alter table public.clan_rules
  add constraint clan_rules_weights_sum_100
  check (index_weight_war + index_weight_activity + index_weight_donations + index_weight_capital + index_weight_games = 100);

alter table public.clan_rules drop column index_pass_threshold;

drop function if exists public.member_war_reliability(uuid);

create function public.member_war_reliability(p_clan_id uuid, p_last_n integer default null)
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
  with per_war as (
    select
      wm.clan_member_id,
      wm.player_tag,
      wm.attacks_used,
      case when w.war_type = 'cwl' then 1 else 2 end as attacks_available,
      coalesce(sum(wa.stars), 0) as stars,
      count(wa.*) as attack_rows,
      row_number() over (partition by wm.clan_member_id order by w.end_time desc nulls last, w.id) as recency
    from public.war_members wm
    join public.wars w on w.id = wm.war_id
    left join public.war_attacks wa on wa.war_id = wm.war_id and wa.player_tag = wm.player_tag
    where w.clan_id = p_clan_id and w.state = 'warEnded' and wm.clan_member_id is not null
    group by wm.clan_member_id, wm.player_tag, wm.war_id, wm.attacks_used, w.war_type, w.end_time, w.id
  )
  select
    clan_member_id,
    player_tag,
    count(*)::int as wars_counted,
    count(*) filter (where attacks_used > 0)::int as wars_attacked,
    sum(attacks_used)::int as attacks_used,
    sum(attacks_available)::int as attacks_available,
    round(100.0 * sum(attacks_used) / nullif(sum(attacks_available), 0), 0) as usage_pct,
    round(sum(stars)::numeric / nullif(sum(attack_rows), 0), 2) as avg_stars
  from per_war
  where p_last_n is null or recency <= p_last_n
  group by clan_member_id, player_tag;
$$;

revoke all on function public.member_war_reliability(uuid, integer) from public;
grant execute on function public.member_war_reliability(uuid, integer) to authenticated;
