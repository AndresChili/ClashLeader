-- register_clan ya se llamaba solo con (tag, name); se añade p_badge_url al
-- final con default null (la única forma en que CREATE OR REPLACE permite
-- ampliar la firma de una función) para que el alta de clan guarde el
-- escudo desde el primer momento, sin esperar al siguiente ciclo del
-- recolector.
create or replace function public.register_clan(p_tag text, p_name text, p_badge_url text default null)
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

  insert into public.clans (tag, name, created_by, badge_url)
  values (p_tag, p_name, auth.uid(), p_badge_url)
  returning id into v_clan_id;

  insert into public.clan_access (clan_id, user_id, role)
  values (v_clan_id, auth.uid(), 'admin');

  insert into public.audit_log (clan_id, actor_id, action, target_type, target_id)
  values (v_clan_id, auth.uid(), 'clan_registered', 'clan', v_clan_id::text);

  return v_clan_id;
end;
$$;

revoke all on function public.register_clan(text, text, text) from public;
grant execute on function public.register_clan(text, text, text) to authenticated;
