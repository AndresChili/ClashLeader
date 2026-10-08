-- Triggers and the one write RPC that is safe to run entirely in SQL
-- (invite redemption: no external API call needed, unlike clan
-- registration which must verify a player token against the Clash of
-- Clans API and therefore lives in the Next.js server, using the
-- Supabase service role key).

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Auto-create the default rule set whenever a clan is registered.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_clan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clan_rules (clan_id) values (new.id)
  on conflict (clan_id) do nothing;
  return new;
end;
$$;

create trigger on_clan_created
  after insert on public.clans
  for each row execute function public.handle_new_clan();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clan_rules_set_updated_at
  before update on public.clan_rules
  for each row execute function public.set_updated_at();

create trigger wars_set_updated_at
  before update on public.wars
  for each row execute function public.set_updated_at();

create trigger promotion_decisions_set_updated_at
  before update on public.promotion_decisions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Invite redemption: validates a one-time code and grants reader access
-- atomically. SECURITY DEFINER so it can read clan_invites (admin-only by
-- RLS) and insert into clan_access on the caller's behalf, but only after
-- checking the hash, expiry and single-use constraints itself.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_clan_invite(p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.clan_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite
  from public.clan_invites
  where code_hash = p_code_hash
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_invite.used_at is not null then
    raise exception 'invite_already_used';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  update public.clan_invites
  set used_at = now(), used_by = auth.uid()
  where id = v_invite.id;

  insert into public.clan_access (clan_id, user_id, role, invited_by)
  values (v_invite.clan_id, auth.uid(), 'reader', v_invite.created_by)
  on conflict (clan_id, user_id) do nothing;

  insert into public.audit_log (clan_id, actor_id, action, target_type, target_id)
  values (v_invite.clan_id, auth.uid(), 'invite_redeemed', 'clan_invite', v_invite.id::text);

  return v_invite.clan_id;
end;
$$;

revoke all on function public.redeem_clan_invite(text) from public;
grant execute on function public.redeem_clan_invite(text) to authenticated;
