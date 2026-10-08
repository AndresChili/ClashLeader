# Modelo de amenazas

Documento vivo: se actualiza en cada fase a medida que se añaden
superficies nuevas (recolector, invitaciones, alta de clanes...).

## Activos a proteger

1. **Datos de los clanes**: nombres, tags, donaciones, estadísticas de
   guerra. No son secretos, pero pertenecen a un clan concreto y no deben
   filtrarse a otros clanes ni a usuarios sin acceso.
2. **Cuentas de los líderes y colíderes**: credenciales de Supabase Auth.
3. **La clave de la API de Clash of Clans y la clave de servicio de
   Supabase**: si se filtran, cualquiera podría leer/escribir todos los
   clanes de todos los usuarios de la app.
4. **Códigos de invitación**: si se filtran antes de caducar o de usarse,
   dan acceso de lectura a un clan ajeno.

## Actores

- **Líder (admin)**: dueño del clan en la app, acceso total a su clan.
- **Colíder (reader)**: acceso de solo lectura a un clan, invitado por su líder.
- **Usuario autenticado sin acceso a un clan**: cualquier otra cuenta registrada.
- **Atacante no autenticado**: tráfico anónimo a la API pública de Supabase o a la app.
- **El recolector**: proceso de confianza, corre en GitHub Actions con la clave de servicio.

## Superficie de ataque y mitigación, por fase

### Fase 1 (actual): cuentas, esquema, RLS

| Amenaza | Mitigación |
| --- | --- |
| Un usuario autenticado consulta datos de un clan al que no pertenece, directamente contra la API REST de Supabase (sin pasar por la app). | RLS deniega por defecto en todas las tablas; solo hay política de `select` cuando existe una fila en `clan_access` para ese usuario y ese clan. Probado en `supabase/tests/database/rls.test.sql`. |
| Un colíder (reader) escribe datos (notas, reglas, decisiones) saltándose la UI. | Las políticas de `insert`/`update` exigen `is_clan_admin()`, no solo `has_clan_access()`. Un reader autenticado que llame directamente a la API REST recibe 0 filas afectadas, nunca un error que confirme que la fila existe. |
| Fuerza bruta de contraseña o de códigos de invitación. | `check_rate_limit()` (función Postgres `SECURITY DEFINER`) limita intentos por identificador+acción; Supabase Auth añade su propio límite nativo en los endpoints de auth. |
| Un atacante roba la cookie de sesión por XSS. | CSP estricta sin `unsafe-inline` en `script-src`; cookies `HttpOnly` así que un script inyectado no puede leerlas aunque XSS ocurriera. |
| Un atacante hace clickjacking de la app dentro de un iframe. | `frame-ancestors 'none'` y `X-Frame-Options: DENY`. |
| Recursión o fuga de RLS al consultar `clan_access` desde su propia política. | Las comprobaciones de acceso usan funciones `SECURITY DEFINER` (`has_clan_access`, `is_clan_admin`) en vez de subconsultas directas sobre la tabla protegida. |

### Fases siguientes (registradas aquí para no perderlas de vista)

- **Recolector (fase 2)**: la clave de la API de Clash of Clans está
  limitada a la IP del proxy de RoyaleAPI; si se filtrara la clave sola
  (sin control del proxy) no serviría para hacer peticiones directas a la
  API oficial. La clave de servicio de Supabase solo vive en el secreto de
  GitHub Actions del workflow programado, nunca en el código.
- **Alta de clanes (fase 6)**: un usuario podría intentar registrar un clan
  que no lidera. Mitigación prevista: verificar con el endpoint oficial de
  verificación de token del jugador y comprobar que el rol devuelto por la
  API para ese tag es `leader`, antes de insertar en `clans`/`clan_access`.
  Esa verificación requiere la clave de la API, así que corre en el
  servidor de `apps/web` (nunca en el navegador) usando el mismo secreto
  que el recolector, con su propio límite de intentos.
- **Invitaciones (fase 6)**: el código se muestra una vez y se guarda como
  hash; `redeem_clan_invite()` revisa caducidad y uso único de forma
  atómica (`for update`) para evitar condiciones de carrera si dos personas
  canjean el mismo código a la vez.

## Fuera de alcance (asumido, no mitigado)

- Ataques físicos o compromiso del dispositivo del usuario.
- Disponibilidad de la API oficial de Clash of Clans o del proxy de
  RoyaleAPI (el recolector simplemente reintentará en la siguiente
  ejecución programada).
- Supercell cambiando el formato de su API sin aviso (se mitiga con tests
  del recolector contra la documentación oficial, no con seguridad).
