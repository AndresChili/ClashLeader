-- Donaciones que dan la nota máxima en la parte de donaciones de la
-- puntuación (ver packages/rules/src/index-score.ts): con 2000, quien done
-- 2000 en la temporada saca 100 y con 1000, 50. Editable en Reglas.
-- Sustituye al cálculo anterior (objetivo de veterano repartido a lo largo
-- de la temporada, sin contar los primeros días).

alter table public.clan_rules
  add column index_donations_full_score integer not null default 2000;

alter table public.clan_rules
  add constraint clan_rules_index_donations_full_score_positive check (index_donations_full_score > 0);
