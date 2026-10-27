-- Temporadas de Juegos del Clan que no cuentan: ni en la pantalla de
-- Juegos ni en la puntuación de miembros. La de octubre de 2026 empezó a
-- seguirse con los Juegos ya en marcha, así que a quien jugó pronto no se
-- le vieron los puntos; para no sumar a unos sí y a otros no, no cuenta
-- para nadie. Los datos se conservan, solo se ignoran.

alter table public.clan_games_seasons
  add column excluded boolean not null default false;

comment on column public.clan_games_seasons.excluded is
  'true = esta temporada no cuenta (datos incompletos); se ignora en Juegos y en la puntuación.';

update public.clan_games_seasons
set excluded = true
where season_id = '2026-10';
