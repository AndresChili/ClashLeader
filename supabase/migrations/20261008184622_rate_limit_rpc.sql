-- Límite de intentos del lado del servidor, llamable desde la conexión
-- anon/authenticated de la app web, sin necesitar nunca la clave de
-- servicio ahí. La tabla en sí sigue siendo ilegible para los clientes
-- (ver 20261008183314_init_schema.sql); esta función SECURITY DEFINER es
-- la única puerta, y solo devuelve un booleano, nunca el contenido de las filas.
create or replace function public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  delete from public.rate_limit_attempts
  where attempted_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_attempts
  from public.rate_limit_attempts
  where identifier = p_identifier
    and action = p_action
    and attempted_at >= now() - make_interval(secs => p_window_seconds);

  if v_attempts >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_attempts (identifier, action)
  values (p_identifier, p_action);

  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;

comment on function public.check_rate_limit is
  'Devuelve false y no registra nada cuando quien llama ya superó el límite; true y registra un intento en caso contrario.';
