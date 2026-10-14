-- Esquema de ClashLeader
-- La API de Clash of Clans es de solo lectura y solo expone el estado
-- actual, así que toda tabla aquí salvo las de "estado actual" es un
-- registro de solo-añadir alimentado por el recolector. El histórico
-- (donaciones por temporada, resultados de guerra, actividad) existe solo
-- porque lo capturamos nosotros mismos.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Perfiles (una fila por auth.users, creada por un trigger más abajo en
-- una sección de migración posterior)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Espejo público y seguro de auth.users, una fila por cuenta.';

-- ---------------------------------------------------------------------------
-- Clanes registrados en la app (no todos los clanes de CoC, solo los que
-- un líder ha dado de alta aquí)
-- ---------------------------------------------------------------------------
create table public.clans (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  name text not null,
  created_by uuid not null references public.profiles (id),
  collector_enabled boolean not null default true,
  last_collected_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.clans
  add constraint clans_tag_format check (tag ~ '^#[0289PYLQGRJCUV]{3,10}$');

comment on table public.clans is 'Clanes dados de alta en ClashLeader por un líder verificado.';

-- Quién puede acceder al panel de un clan, y con qué rol.
create table public.clan_access (
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'reader')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

comment on table public.clan_access is 'admin = líder (control total), reader = colíder (solo lectura).';

-- Códigos de invitación de un solo uso para colíderes, con hash y caducidad.
create table public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  code_hash text not null,
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index clan_invites_code_hash_idx on public.clan_invites (code_hash);
create index clan_invites_clan_id_idx on public.clan_invites (clan_id) where used_at is null;

comment on table public.clan_invites is 'Solo se guarda el hash del código de invitación, nunca el texto plano.';

-- Umbrales de reglas editables por clan. Una fila por clan, valores por defecto del encargo.
create table public.clan_rules (
  clan_id uuid primary key references public.clans (id) on delete cascade,
  kick_inactivity_days integer not null default 3,
  veteran_min_days integer not null default 30,
  veteran_min_donations_per_season integer not null default 500,
  coleader_min_days integer not null default 90,
  coleader_min_attack_usage_pct integer not null default 90,
  coleader_min_donations_per_season integer not null default 1000,
  index_weight_war integer not null default 40,
  index_weight_donations integer not null default 30,
  index_weight_capital integer not null default 15,
  index_weight_games integer not null default 15,
  index_pass_threshold integer not null default 70,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.clan_rules
  add constraint clan_rules_weights_sum_100
  check (index_weight_war + index_weight_donations + index_weight_capital + index_weight_games = 100);

comment on table public.clan_rules is 'Umbrales editables por clan; packages/rules los lee de aquí, nunca los hardcodea.';

-- ---------------------------------------------------------------------------
-- Miembros del clan: una fila por episodio de membresía (un jugador puede
-- salir y volver a entrar; cada episodio se sigue por separado para que
-- el histórico se mantenga honesto).
-- ---------------------------------------------------------------------------
create table public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  player_tag text not null,
  name text not null,
  in_game_role text not null check (in_game_role in ('leader', 'coLeader', 'admin', 'member')),
  first_seen_at timestamptz not null default now(),
  manual_join_date date,
  left_at timestamptz,
  is_current boolean not null default true,
  last_activity_detected_at timestamptz,
  on_watch boolean not null default false,
  on_watch_at timestamptz,
  on_watch_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on column public.clan_members.in_game_role is 'Rol crudo de CoC; "admin" es el nombre que da la API para veterano.';
comment on column public.clan_members.manual_join_date is 'Fecha de entrada opcional introducida por el líder, sustituye a first_seen_at para "días en el clan".';

create index clan_members_clan_id_idx on public.clan_members (clan_id);
create unique index clan_members_current_unique_idx
  on public.clan_members (clan_id, player_tag) where is_current;

-- Captura cruda periódica del estado de un miembro, tomada en cada ejecución del recolector.
create table public.member_snapshots (
  id bigint generated always as identity primary key,
  clan_member_id uuid not null references public.clan_members (id) on delete cascade,
  collected_at timestamptz not null default now(),
  donations integer not null,
  donations_received integer not null,
  exp_level integer,
  trophies integer,
  town_hall_level integer,
  league_name text,
  in_game_role text not null
);

create index member_snapshots_member_id_idx on public.member_snapshots (clan_member_id, collected_at desc);

comment on table public.member_snapshots is 'Solo-añadir. Las donaciones se reinician cada temporada, así que el valor previo al reinicio se copia a donation_season_totals.';

-- Totales de donaciones congelados justo antes de cada reinicio de temporada.
create table public.donation_season_totals (
  id bigint generated always as identity primary key,
  clan_member_id uuid not null references public.clan_members (id) on delete cascade,
  season_id text not null,
  donations integer not null,
  donations_received integer not null,
  captured_at timestamptz not null default now(),
  unique (clan_member_id, season_id)
);

-- Entradas y salidas, detectadas comparando la lista de miembros entre ejecuciones del recolector.
create table public.membership_events (
  id bigint generated always as identity primary key,
  clan_id uuid not null references public.clans (id) on delete cascade,
  clan_member_id uuid references public.clan_members (id) on delete set null,
  player_tag text not null,
  player_name text not null,
  event_type text not null check (event_type in ('joined', 'left')),
  detected_at timestamptz not null default now()
);

create index membership_events_clan_id_idx on public.membership_events (clan_id, detected_at desc);

comment on table public.membership_events is 'La API no distingue una salida voluntaria de una expulsión.';

-- ---------------------------------------------------------------------------
-- Guerras (normales, amistosas y de CWL)
-- ---------------------------------------------------------------------------
create table public.cwl_groups (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  season text not null,
  state text not null,
  created_at timestamptz not null default now(),
  unique (clan_id, season)
);

create table public.wars (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  cwl_group_id uuid references public.cwl_groups (id) on delete set null,
  war_type text not null check (war_type in ('random', 'friendly', 'cwl')),
  state text not null check (state in ('preparation', 'inWar', 'warEnded')),
  team_size integer not null,
  opponent_tag text,
  opponent_name text,
  preparation_start_time timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  clan_stars integer,
  clan_destruction_pct numeric(5, 2),
  clan_attacks_used integer,
  opponent_stars integer,
  opponent_destruction_pct numeric(5, 2),
  result text check (result in ('win', 'lose', 'tie')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wars_clan_id_idx on public.wars (clan_id, start_time desc);

-- Alineación de una guerra: quién estaba en la lineup, en qué posición.
create table public.war_members (
  war_id uuid not null references public.wars (id) on delete cascade,
  clan_member_id uuid references public.clan_members (id) on delete set null,
  player_tag text not null,
  player_name text not null,
  map_position integer not null,
  town_hall_level integer,
  attacks_used integer not null default 0,
  best_opponent_stars integer not null default 0,
  primary key (war_id, player_tag)
);

-- Ataques individuales dentro de una guerra, solo-añadir, guardados al terminar la guerra.
create table public.war_attacks (
  id bigint generated always as identity primary key,
  war_id uuid not null references public.wars (id) on delete cascade,
  player_tag text not null,
  attack_order integer not null,
  stars integer not null,
  destruction_percentage numeric(5, 2) not null,
  defender_tag text,
  created_at timestamptz not null default now(),
  unique (war_id, player_tag, attack_order)
);

create index war_attacks_war_id_idx on public.war_attacks (war_id);

-- ---------------------------------------------------------------------------
-- Capital del clan
-- ---------------------------------------------------------------------------
create table public.capital_seasons (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  season_id text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  unique (clan_id, season_id)
);

create table public.capital_contributions (
  id bigint generated always as identity primary key,
  capital_season_id uuid not null references public.capital_seasons (id) on delete cascade,
  player_tag text not null,
  player_name text not null,
  attacks_used integer not null default 0,
  attack_limit integer not null default 6,
  capital_gold_looted integer not null default 0,
  captured_at timestamptz not null default now(),
  unique (capital_season_id, player_tag)
);

-- ---------------------------------------------------------------------------
-- Juegos del clan (sin endpoint: los puntos son la diferencia del logro "Games Champion")
-- ---------------------------------------------------------------------------
create table public.clan_games_seasons (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  season_id text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  unique (clan_id, season_id)
);

create table public.clan_games_points (
  id bigint generated always as identity primary key,
  clan_games_season_id uuid not null references public.clan_games_seasons (id) on delete cascade,
  player_tag text not null,
  player_name text not null,
  achievement_value_before integer not null,
  achievement_value_after integer,
  points integer,
  captured_at timestamptz not null default now(),
  unique (clan_games_season_id, player_tag)
);

comment on table public.clan_games_points is 'points = achievement_value_after - achievement_value_before, con el tope de 4000 que impone el propio juego.';

-- ---------------------------------------------------------------------------
-- Notas del líder y decisiones de ascenso
-- ---------------------------------------------------------------------------
create table public.leader_notes (
  id uuid primary key default gen_random_uuid(),
  clan_member_id uuid not null references public.clan_members (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index leader_notes_member_id_idx on public.leader_notes (clan_member_id, created_at desc);

create table public.promotion_decisions (
  clan_member_id uuid not null references public.clan_members (id) on delete cascade,
  candidate_type text not null check (candidate_type in ('veteran', 'coleader')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'discarded')),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (clan_member_id, candidate_type)
);

comment on table public.promotion_decisions is 'Solo el estado actual; el histórico completo de quién decidió qué, y cuándo, vive en audit_log.';

-- ---------------------------------------------------------------------------
-- Registro de auditoría: toda escritura hecha por un admin, para
-- trazabilidad (OWASP A09).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  clan_id uuid references public.clans (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_clan_id_idx on public.audit_log (clan_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Límite de intentos para los flujos que Supabase Auth no cubre por sí
-- solo (canje de invitaciones, verificación del token del jugador).
-- ---------------------------------------------------------------------------
create table public.rate_limit_attempts (
  id bigint generated always as identity primary key,
  identifier text not null,
  action text not null,
  attempted_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx on public.rate_limit_attempts (identifier, action, attempted_at desc);

comment on table public.rate_limit_attempts is 'Registro de vida corta; las filas más viejas que la ventana correspondiente se podan desde el código de la aplicación.';
