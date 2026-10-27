-- Repara war_members.clan_member_id de jugadores echados y readmitidos.
--
-- La API sigue devolviendo la guerra terminada hasta que empieza la
-- siguiente, y el recolector reescribía clan_member_id en cada consulta:
-- al echar al jugador la fila quedaba en null, y al readmitirle se
-- enganchaba a su episodio de membresía nuevo. Resultado: la ficha nueva
-- heredaba la guerra en la que no atacó y la app volvía a marcarle para
-- expulsar. El recolector ya no reasigna filas (ver upsertWarRoster);
-- esto arregla las que ya estaban mal.
--
-- Cada fila pasa al episodio que estaba en el clan durante esa guerra:
-- entró antes de que terminara y no se había ido antes de que empezara.
-- Si hay varios, el más antiguo (el que salió en la alineación). Sin
-- ninguno que encaje se deja como está.

with episode as (
  select
    wm.war_id,
    wm.player_tag,
    (
      select cm.id
      from public.clan_members cm
      where cm.clan_id = w.clan_id
        and cm.player_tag = wm.player_tag
        and cm.first_seen_at <= coalesce(w.end_time, now())
        and (cm.left_at is null or cm.left_at >= coalesce(w.start_time, w.end_time, now()))
      order by cm.first_seen_at asc
      limit 1
    ) as clan_member_id
  from public.war_members wm
  join public.wars w on w.id = wm.war_id
)
update public.war_members wm
set clan_member_id = episode.clan_member_id
from episode
where episode.war_id = wm.war_id
  and episode.player_tag = wm.player_tag
  and episode.clan_member_id is not null
  and wm.clan_member_id is distinct from episode.clan_member_id;
