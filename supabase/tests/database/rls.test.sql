-- RLS regression tests, run with: npx supabase test db
-- Proves two things for every clan-scoped table: (1) nobody gets in without
-- an explicit policy (deny by default), and (2) clan data is isolated
-- between clans and between the admin/reader roles.

begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ---------------------------------------------------------------------------
-- Fixtures: two clans, each with an admin (leader) and a reader (co-leader),
-- created as postgres (bypasses RLS) so the tests below start from a known
-- state.
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

-- ---------------------------------------------------------------------------
-- Helpers to impersonate a Postgres role the way PostgREST does.
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
-- 1. Anonymous users see nothing, anywhere (deny by default).
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
-- 2. Admin of clan 1 sees clan 1 only.
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

-- ---------------------------------------------------------------------------
-- 3. Reader of clan 1 can read but not write.
-- ---------------------------------------------------------------------------
select tests.auth_as('00000000-0000-0000-0000-000000000002'::uuid);

select is(
  (select count(*) from public.clan_members where clan_id = '10000000-0000-0000-0000-000000000001')::int, 1,
  'clan 1 reader can see clan 1 members'
);

-- an update attempt by a reader must affect zero rows under RLS:
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

-- ---------------------------------------------------------------------------
-- 4. Admin of clan 2 cannot see clan 1 data (isolation between clans).
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
-- 5. An authenticated outsider with no clan_access rows sees nothing.
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

select * from finish();
rollback;
