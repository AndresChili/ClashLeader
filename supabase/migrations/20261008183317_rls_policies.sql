-- Row Level Security: every table is locked down by default (RLS enabled,
-- no policy = no access). Policies below are the only doors in.
--
-- Write access for in-game data (members, wars, capital, games) belongs to
-- the collector, which uses the Supabase service role key and therefore
-- bypasses RLS entirely. Authenticated users only ever read that data, or
-- write to the small set of "leader decision" tables, and only as 'admin'.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can check membership without
-- re-triggering RLS on clan_access, which would recurse).
-- ---------------------------------------------------------------------------
create or replace function public.has_clan_access(p_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clan_access
    where clan_id = p_clan_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_clan_admin(p_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clan_access
    where clan_id = p_clan_id and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.clan_id_for_member(p_member_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clan_id from public.clan_members where id = p_member_id;
$$;

create or replace function public.clan_id_for_war(p_war_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clan_id from public.wars where id = p_war_id;
$$;

create or replace function public.clan_id_for_capital_season(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clan_id from public.capital_seasons where id = p_id;
$$;

create or replace function public.clan_id_for_clan_games_season(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clan_id from public.clan_games_seasons where id = p_id;
$$;

revoke all on function public.has_clan_access(uuid) from public;
revoke all on function public.is_clan_admin(uuid) from public;
revoke all on function public.clan_id_for_member(uuid) from public;
revoke all on function public.clan_id_for_war(uuid) from public;
revoke all on function public.clan_id_for_capital_season(uuid) from public;
revoke all on function public.clan_id_for_clan_games_season(uuid) from public;
grant execute on function public.has_clan_access(uuid) to authenticated;
grant execute on function public.is_clan_admin(uuid) to authenticated;
grant execute on function public.clan_id_for_member(uuid) to authenticated;
grant execute on function public.clan_id_for_war(uuid) to authenticated;
grant execute on function public.clan_id_for_capital_season(uuid) to authenticated;
grant execute on function public.clan_id_for_clan_games_season(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clans enable row level security;
alter table public.clan_access enable row level security;
alter table public.clan_invites enable row level security;
alter table public.clan_rules enable row level security;
alter table public.clan_members enable row level security;
alter table public.member_snapshots enable row level security;
alter table public.donation_season_totals enable row level security;
alter table public.membership_events enable row level security;
alter table public.cwl_groups enable row level security;
alter table public.wars enable row level security;
alter table public.war_members enable row level security;
alter table public.war_attacks enable row level security;
alter table public.capital_seasons enable row level security;
alter table public.capital_contributions enable row level security;
alter table public.clan_games_seasons enable row level security;
alter table public.clan_games_points enable row level security;
alter table public.leader_notes enable row level security;
alter table public.promotion_decisions enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limit_attempts enable row level security;

-- Force RLS for table owners too (defence in depth; the app never connects
-- as the table owner, but this keeps the guarantee explicit).
alter table public.profiles force row level security;
alter table public.clans force row level security;
alter table public.clan_access force row level security;
alter table public.clan_invites force row level security;
alter table public.clan_rules force row level security;
alter table public.clan_members force row level security;
alter table public.member_snapshots force row level security;
alter table public.donation_season_totals force row level security;
alter table public.membership_events force row level security;
alter table public.cwl_groups force row level security;
alter table public.wars force row level security;
alter table public.war_members force row level security;
alter table public.war_attacks force row level security;
alter table public.capital_seasons force row level security;
alter table public.capital_contributions force row level security;
alter table public.clan_games_seasons force row level security;
alter table public.clan_games_points force row level security;
alter table public.leader_notes force row level security;
alter table public.promotion_decisions force row level security;
alter table public.audit_log force row level security;
alter table public.rate_limit_attempts force row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- clans
-- ---------------------------------------------------------------------------
create policy "clans_select_member" on public.clans
  for select using (public.has_clan_access(id));

-- Creation happens through the register_clan() RPC (security definer) after
-- verifying the player token and leader role server-side; no direct insert
-- policy for clients.
create policy "clans_update_admin" on public.clans
  for update using (public.is_clan_admin(id)) with check (public.is_clan_admin(id));

-- ---------------------------------------------------------------------------
-- clan_access
-- ---------------------------------------------------------------------------
create policy "clan_access_select_member" on public.clan_access
  for select using (public.has_clan_access(clan_id));

-- Rows are only written by register_clan() (first admin) and
-- redeem_clan_invite() (new reader), both SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- clan_invites
-- ---------------------------------------------------------------------------
create policy "clan_invites_select_admin" on public.clan_invites
  for select using (public.is_clan_admin(clan_id));

create policy "clan_invites_insert_admin" on public.clan_invites
  for insert with check (public.is_clan_admin(clan_id));

-- Redemption (setting used_at/used_by) happens through redeem_clan_invite().

-- ---------------------------------------------------------------------------
-- clan_rules
-- ---------------------------------------------------------------------------
create policy "clan_rules_select_member" on public.clan_rules
  for select using (public.has_clan_access(clan_id));

create policy "clan_rules_update_admin" on public.clan_rules
  for update using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));

-- ---------------------------------------------------------------------------
-- clan_members
-- ---------------------------------------------------------------------------
create policy "clan_members_select_member" on public.clan_members
  for select using (public.has_clan_access(clan_id));

create policy "clan_members_update_admin" on public.clan_members
  for update using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));

-- ---------------------------------------------------------------------------
-- Read-only, collector-fed history tables
-- ---------------------------------------------------------------------------
create policy "member_snapshots_select_member" on public.member_snapshots
  for select using (public.has_clan_access(public.clan_id_for_member(clan_member_id)));

create policy "donation_season_totals_select_member" on public.donation_season_totals
  for select using (public.has_clan_access(public.clan_id_for_member(clan_member_id)));

create policy "membership_events_select_member" on public.membership_events
  for select using (public.has_clan_access(clan_id));

create policy "cwl_groups_select_member" on public.cwl_groups
  for select using (public.has_clan_access(clan_id));

create policy "wars_select_member" on public.wars
  for select using (public.has_clan_access(clan_id));

create policy "war_members_select_member" on public.war_members
  for select using (public.has_clan_access(public.clan_id_for_war(war_id)));

create policy "war_attacks_select_member" on public.war_attacks
  for select using (public.has_clan_access(public.clan_id_for_war(war_id)));

create policy "capital_seasons_select_member" on public.capital_seasons
  for select using (public.has_clan_access(clan_id));

create policy "capital_contributions_select_member" on public.capital_contributions
  for select using (public.has_clan_access(public.clan_id_for_capital_season(capital_season_id)));

create policy "clan_games_seasons_select_member" on public.clan_games_seasons
  for select using (public.has_clan_access(clan_id));

create policy "clan_games_points_select_member" on public.clan_games_points
  for select using (public.has_clan_access(public.clan_id_for_clan_games_season(clan_games_season_id)));

-- ---------------------------------------------------------------------------
-- leader_notes
-- ---------------------------------------------------------------------------
create policy "leader_notes_select_member" on public.leader_notes
  for select using (public.has_clan_access(public.clan_id_for_member(clan_member_id)));

create policy "leader_notes_insert_admin" on public.leader_notes
  for insert with check (
    public.is_clan_admin(public.clan_id_for_member(clan_member_id))
    and author_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- promotion_decisions
-- ---------------------------------------------------------------------------
create policy "promotion_decisions_select_member" on public.promotion_decisions
  for select using (public.has_clan_access(public.clan_id_for_member(clan_member_id)));

create policy "promotion_decisions_insert_admin" on public.promotion_decisions
  for insert with check (public.is_clan_admin(public.clan_id_for_member(clan_member_id)));

create policy "promotion_decisions_update_admin" on public.promotion_decisions
  for update using (public.is_clan_admin(public.clan_id_for_member(clan_member_id)))
  with check (public.is_clan_admin(public.clan_id_for_member(clan_member_id)));

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_clan_admin(clan_id));

create policy "audit_log_insert_self" on public.audit_log
  for insert with check (actor_id = auth.uid() and public.has_clan_access(clan_id));

-- rate_limit_attempts: intentionally no policies at all. Only server-side
-- code using the service role key reads or writes it.
