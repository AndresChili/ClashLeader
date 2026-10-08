-- Clan registration itself (clans/clan_access inserts) is a plain SQL
-- RPC: the actual verification — the Clash of Clans player-token check
-- and the leader-role check — needs the API key and so happens in the
-- Next.js server (apps/web), never in Postgres. This function is only
-- called *after* that verification passes, and its only job is the
-- atomic insert + audit entry, under the caller's own identity.
create or replace function public.register_clan(p_tag text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.clans (tag, name, created_by)
  values (p_tag, p_name, auth.uid())
  returning id into v_clan_id;

  insert into public.clan_access (clan_id, user_id, role)
  values (v_clan_id, auth.uid(), 'admin');

  insert into public.audit_log (clan_id, actor_id, action, target_type, target_id)
  values (v_clan_id, auth.uid(), 'clan_registered', 'clan', v_clan_id::text);

  return v_clan_id;
end;
$$;

revoke all on function public.register_clan(text, text) from public;
grant execute on function public.register_clan(text, text) to authenticated;
