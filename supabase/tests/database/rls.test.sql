-- Tests de regresión de RLS, se ejecutan con: npx supabase test db
-- Demuestra dos cosas para cada tabla con alcance de clan: (1) nadie entra
-- sin una política explícita (denegado por defecto), y (2) los datos de
-- cada clan están aislados entre clanes y entre los roles admin/reader.

begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------------------------------------------------------------------------
-- Datos de ejemplo: dos clanes, cada uno con un admin (líder) y un reader
-- (colíder), creados como postgres (se salta RLS) para que los tests de
-- abajo partan de un estado conocido.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'admin1@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'reader1@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000003', 'admin2@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000004', 'outsider@example.com', '{}');

insert into public.clans (id, tag, name, created_by)
values ('10000000-0000-0000-0000-000000000001', '#QVCLJ289', 'Clan Uno', '00000000-0000-0000-0000-000000000001');

insert into public.clans (id, tag, name, created_by)
values ('10000000-0000-0000-0000-000000000002', '#QVCLJ29U', 'Clan Dos', '00000000-0000-0000-0000-000000000003');

insert into public.clan_access (clan_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'reader'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'admin');

insert into public.clan_members (id, clan_id, player_tag, name, in_game_role)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '#P1', 'Marcos', 'member');

insert into public.member_snapshots (clan_member_id, donations, donations_received, in_game_role)
values ('20000000-0000-0000-0000-000000000001', 320, 180, 'member');

-- ---------------------------------------------------------------------------
-- Helpers para suplantar un rol de Postgres igual que hace PostgREST.
-- ---------------------------------------------------------------------------
create schema if not exists tests;

create or replace function tests.auth_as(p_user_id uuid) returns void as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$ language plpgsql;

create or replace function tests.auth_as_anon() returns void as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end;
$$ language plpgsql;

create or replace function tests.try_update_kick_days(p_clan_id uuid, p_days int) returns int as $$
declare
  v_count int;
begin
  update public.clan_rules set kick_inactivity_days = p_days where clan_id = p_clan_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql;

grant usage on schema tests to anon, authenticated;
grant execute on function tests.auth_as(uuid) to anon, authenticated;
grant execute on function tests.auth_as_anon() to anon, authenticated;
grant execute on function tests.try_update_kick_days(uuid, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Usuarios anónimos no ven nada, en ningún sitio (denegado por defecto).
-- ---------------------------------------------------------------------------
select tests.auth_as_anon();

select is(
  (select count(*) from public.clans)::int, 0,
  'anon cannot select any clan'
);

select is(
  (select count(*) from public.clan_members)::int, 0,
  'anon cannot select any clan member'
);

select throws_ok(
  $$ insert into public.clans (tag, name, created_by) values ('#X', 'x', '00000000-0000-0000-0000-000000000001') $$,
  'new row violates row-level security policy for table "clans"',
  'anon cannot insert a clan'
);

-- ---------------------------------------------------------------------------
-- 2. El admin del clan 1 solo ve el clan 1.
-- ---------------------------------------------------------------------------
select tests.auth_as('00000000-0000-0000-0000-000000000001'::uuid);

select is(
  (select count(*) from public.clans)::int, 1,
  'clan 1 admin sees exactly one clan'
);

select is(
  (select name from public.clans limit 1), 'Clan Uno',
  'clan 1 admin sees the correct clan'
);

select is(
  (select count(*) from public.clan_members where clan_id = '10000000-0000-0000-0000-000000000001')::int, 1,
  'clan 1 admin sees clan 1 members'
);

select lives_ok(
  $$ update public.clan_rules set kick_inactivity_days = 5 where clan_id = '10000000-0000-0000-0000-000000000001' $$,
  'clan 1 admin can update clan 1 rules'
);

select is(
  (select count(*) from public.latest_member_snapshots_for_viewer('10000000-0000-0000-0000-000000000001'))::int, 1,
  'clan 1 admin sees clan 1 latest snapshots via the viewer RPC'
);

select lives_ok(
  $$ insert into public.promotion_decisions (clan_member_id, candidate_type, status, decided_by, decided_at)
     values ('20000000-0000-0000-0000-000000000001', 'veteran', 'approved', '00000000-0000-0000-0000-000000000001', now()) $$,
  'clan 1 admin can approve a promotion candidate'
);

-- ---------------------------------------------------------------------------
-- 3. El reader del clan 1 puede leer pero no escribir.
-- ---------------------------------------------------------------------------
select tests.auth_as('00000000-0000-0000-0000-000000000002'::uuid);

select is(
  (select count(*) from public.clan_members where clan_id = '10000000-0000-0000-0000-000000000001')::int, 1,
  'clan 1 reader can see clan 1 members'
);

-- un intento de update por parte de un reader debe afectar a cero filas bajo RLS:
select is(
  tests.try_update_kick_days('10000000-0000-0000-0000-000000000001', 99),
  0,
  'clan 1 reader cannot update clan 1 rules'
);

select throws_ok(
  $$ insert into public.leader_notes (clan_member_id, author_id, note)
     values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'nota') $$,
  'new row violates row-level security policy for table "leader_notes"',
  'clan 1 reader cannot add a leader note'
);

select throws_ok(
  $$ insert into public.promotion_decisions (clan_member_id, candidate_type, status, decided_by, decided_at)
     values ('20000000-0000-0000-0000-000000000001', 'coleader', 'approved', '00000000-0000-0000-0000-000000000002', now()) $$,
  'new row violates row-level security policy for table "promotion_decisions"',
  'clan 1 reader cannot approve a promotion candidate'
);

-- ---------------------------------------------------------------------------
-- 4. El admin del clan 2 no puede ver datos del clan 1 (aislamiento entre clanes).
-- ---------------------------------------------------------------------------
select tests.auth_as('00000000-0000-0000-0000-000000000003'::uuid);

select is(
  (select count(*) from public.clans)::int, 1,
  'clan 2 admin sees exactly one clan'
);

select is(
  (select count(*) from public.clan_members where clan_id = '10000000-0000-0000-0000-000000000001')::int, 0,
  'clan 2 admin cannot see clan 1 members'
);

-- ---------------------------------------------------------------------------
-- 5. Un usuario autenticado sin filas en clan_access no ve nada.
-- ---------------------------------------------------------------------------
select tests.auth_as('00000000-0000-0000-0000-000000000004'::uuid);

select is(
  (select count(*) from public.clans)::int, 0,
  'outsider with no clan_access sees no clans'
);

select is(
  (select count(*) from public.audit_log)::int, 0,
  'outsider sees no audit log rows'
);

select is(
  (select count(*) from public.latest_member_snapshots_for_viewer('10000000-0000-0000-0000-000000000001'))::int, 0,
  'outsider gets no rows from the viewer RPC for a clan they cannot access'
);

-- ---------------------------------------------------------------------------
-- 6. register_clan() le da a quien llama acceso de admin a un clan nuevo.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select public.register_clan('#QVCLJ2PYG', 'Clan Nuevo') $$,
  'an authenticated user can register a new clan'
);

select is(
  (select role from public.clan_access where clan_id = (select id from public.clans where tag = '#QVCLJ2PYG')),
  'admin',
  'the registering user becomes that clan''s admin'
);

select * from finish();
rollback;
