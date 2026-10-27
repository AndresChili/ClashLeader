-- El líder puede quitar el acceso a quien entró con un código (Equipo ›
-- Quitar acceso). Solo a lectores: ningún admin puede quitarse a sí mismo
-- ni a otro admin, para que el clan nunca se quede sin nadie que lo
-- administre. Para volver a entrar haría falta un código nuevo.

create policy "clan_access_delete_admin" on public.clan_access
  for delete using (public.is_clan_admin(clan_id) and role = 'reader');
