-- El alta de clan en sí (los inserts en clans/clan_access) es un RPC SQL
-- simple: la verificación real — la comprobación del token de jugador de
-- Clash of Clans y del rol de líder — necesita la clave de la API y por
-- eso pasa en el servidor de Next.js (apps/web), nunca en Postgres. Esta
-- función solo se llama *después* de que esa verificación pasa, y su
-- único trabajo es el insert atómico más la entrada de auditoría, bajo la
-- identidad de quien llama.
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
