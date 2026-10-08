-- The collector polls the same in-progress war every 15 minutes and needs
-- to update one row, not insert a new one each time. The Clash of Clans
-- API gives a stable war_tag for CWL wars but nothing for a regular or
-- friendly war, so the collector synthesizes one ("reg:<preparation_start
-- _time>") for those — preparation_start_time doesn't change between
-- polls of the same war, so the synthetic tag is stable for its lifetime.
--
-- (A single non-partial unique constraint is used, rather than two
-- partial indexes keyed on "war_tag is [not] null", because Postgres's
-- ON CONFLICT (col, col) target must match a real constraint; a partial
-- index only satisfies that with an explicit WHERE clause on the
-- conflict target, which plain upsert() calls don't express.)
alter table public.wars add column war_tag text not null;

create unique index wars_natural_key on public.wars (clan_id, war_tag);
