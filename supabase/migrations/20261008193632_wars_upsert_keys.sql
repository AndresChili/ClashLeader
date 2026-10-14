-- El recolector consulta la misma guerra en curso cada 15 minutos y
-- necesita actualizar una fila, no insertar una nueva cada vez. La API de
-- Clash of Clans da un war_tag estable para guerras de CWL pero nada para
-- una guerra normal o amistosa, así que el recolector sintetiza uno
-- ("reg:<preparation_start_time>") para esos casos — preparation_start_time
-- no cambia entre consultas de la misma guerra, así que la tag sintética
-- es estable durante toda su vida.
--
-- (Se usa un único constraint unique no parcial, en vez de dos índices
-- parciales con clave en "war_tag is [not] null", porque el target de
-- ON CONFLICT (col, col) de Postgres debe coincidir con un constraint
-- real; un índice parcial solo cumple eso con una cláusula WHERE
-- explícita en el target del conflicto, que las llamadas a upsert() simples no expresan.)
alter table public.wars add column war_tag text not null;

create unique index wars_natural_key on public.wars (clan_id, war_tag);
