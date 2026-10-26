-- El cron "schedule" de GitHub Actions no es fiable: en la práctica el
-- recolector (programado cada 15 min) se ejecutaba cada 2-6 horas. Así que
-- el reloj pasa a Supabase: pg_cron lanza cada 5 minutos el workflow vía
-- workflow_dispatch con pg_net. El cron de GitHub se queda como respaldo.
--
-- El token NO va en esta migración: es un fine-grained PAT con permiso
-- "Actions: Read and write" solo sobre este repositorio, guardado en Vault:
--   select vault.create_secret('<token>', 'github_collector_dispatch_token');
-- Mientras no exista el secreto, la función no hace nada.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.dispatch_collector_workflow()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where name = 'github_collector_dispatch_token';

  if token is null then
    raise notice 'github_collector_dispatch_token no está en Vault; se omite el disparo del recolector';
    return;
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/AndresChili/ClashLeader/actions/workflows/collector.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'clashleader-cron'
    ),
    body := jsonb_build_object('ref', 'main')
  );
end;
$$;

revoke all on function public.dispatch_collector_workflow() from public, anon, authenticated;

select cron.schedule('dispatch-collector', '*/5 * * * *', 'select public.dispatch_collector_workflow()');
