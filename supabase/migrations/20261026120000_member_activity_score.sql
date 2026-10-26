-- Suma de los logros del perfil del jugador que solo suben jugando él
-- (oro/elixir saqueado, victorias, obstáculos quitados, donaciones,
-- desafíos de temporada, capital...). El recolector la compara entre
-- consultas: si sube, hubo actividad. Nullable porque hasta la primera
-- consulta tras esta migración no hay valor de referencia.
alter table public.clan_members
  add column activity_score bigint;

comment on column public.clan_members.activity_score is 'Suma de logros que solo avanzan con juego propio; si sube entre consultas del recolector se marca actividad.';
