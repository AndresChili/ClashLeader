-- Escudo del clan, tal como lo expone la API (badgeUrls.medium). Se guarda
-- al dar de alta el clan y se refresca en cada ciclo del recolector; nullable
-- porque los clanes ya registrados antes de esto no lo tienen hasta el
-- siguiente ciclo.
alter table public.clans
  add column badge_url text;

comment on column public.clans.badge_url is 'badgeUrls.medium de la API de Clash of Clans. Se rellena al registrar el clan y se refresca en cada ciclo del recolector.';
