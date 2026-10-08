-- Server-side rate limiting callable from the web app's anon/authenticated
-- connection, without ever needing the service role key there. The table
-- itself stays unreadable to clients (see 20261008183314_init_schema.sql);
-- this SECURITY DEFINER function is the only door, and it only ever
-- returns a boolean, never row contents.
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
  'Returns false and records nothing once the caller is over the limit; true and logs one attempt otherwise.';
