-- El líder puede borrar códigos de invitación que nadie ha usado: para
-- retirar uno que ya no quiere repartir y para que al generar uno nuevo
-- no se acumulen los anteriores (ver createInvite en apps/web). Los ya
-- canjeados se quedan, son el rastro de quién entró con qué invitación.

create policy "clan_invites_delete_admin" on public.clan_invites
  for delete using (public.is_clan_admin(clan_id) and used_at is null);
