# ClashLeader

Panel para líderes de clanes de **Clash of Clans**: recoge automáticamente
las estadísticas de los miembros con la API oficial y ayuda a decidir a
quién expulsar, a quién ascender y a quién meter en guerra. La app solo
avisa y propone — expulsar y ascender se hace siempre dentro del juego.

> Este material no es oficial y no está respaldado por Supercell. Más
> información en la [Política de contenido de fans de Supercell](https://www.supercell.com/fan-content-policy).
> La app no cobra por nada.

Proyecto de portfolio, construido por fases y documentado a medida que
avanza. Estado actual: **fase 6 de 7, en progreso** (ver [Fases](#fases)).

## Capturas

_Pendiente: se añaden en la fase 7 (cierre), cuando todas las pantallas
tengan datos reales y no solo los placeholders "—" de las fases
intermedias._ El diseño completo de las 7 pantallas (más
registro/login/alta de clan) sigue `diseno-app-clan.png` en la raíz del
repositorio.

## Arquitectura

```
┌──────────────────┐        cada 15 min, GitHub Actions
│  apps/collector   │ ───────────────────────────────────┐
│  (script TS)      │                                     │
└─────────┬─────────┘                                     │
          │ HTTPS vía proxy RoyaleAPI (IP fija)            │
          ▼                                                ▼
┌──────────────────┐   clave de servicio    ┌─────────────────────┐
│ API oficial de    │◄───────────────────────│     Supabase        │
│ Clash of Clans     │   (bypassa RLS)         │  Postgres + Auth    │
└──────────────────┘                          │  + RLS por clan      │
                                               └──────────┬───────────┘
                                                           │ clave anónima
                                                           │ (sujeta a RLS)
                                                  ┌────────▼─────────┐
                                                  │     apps/web       │
                                                  │  Next.js App Router │
                                                  │  (Vercel)            │
                                                  └───────────────────┘
```

- **apps/web**: Next.js (App Router, TypeScript estricto, Tailwind CSS).
  Interfaz en español. Server Actions para toda mutación; nunca llama a la
  API de Clash of Clans directamente.
- **apps/collector**: script de Node/TypeScript independiente, sin
  dependencia de Next.js. Es el único componente con la clave de la API de
  Clash of Clans y la clave de servicio de Supabase.
- **packages/rules**: funciones puras (umbrales de expulsión, ascensos,
  índice 0–100), con sus propios tests, sin dependencias de Next ni de
  Supabase.
- **supabase/**: migraciones SQL (`migrations/`), políticas de RLS, datos
  de ejemplo para desarrollo local (`seed.sql`) y tests pgTAP
  (`tests/database/`).

## Decisiones técnicas y por qué

- **Monorepo con npm workspaces, no pnpm**: el entorno de desarrollo no
  tenía permisos para instalar pnpm globalmente vía corepack; npm
  workspaces no necesita instalación aparte y cubre lo que hace falta aquí
  (tres paquetes, sin publicación a npm).
- **El recolector llama a RoyaleAPI, no a la API oficial directamente**: la
  clave de la API de Clash of Clans está atada a una IP, y ni la máquina de
  desarrollo ni los runners de GitHub Actions tienen una IP fija. El proxy
  de RoyaleAPI sí la tiene; la URL base es variable de entorno
  (`CLASH_API_BASE_URL`) para poder cambiarla sin tocar código.
- **El límite de intentos vive en Postgres (`check_rate_limit`), no en la
  clave de servicio dentro de `apps/web`**: registrar intentos de
  login/registro/invitación requiere escribir en una tabla antes incluso de
  que el usuario esté autenticado, pero la clave de servicio de Supabase
  debe quedarse únicamente en el recolector. Una función `SECURITY
  DEFINER` callable con la clave anónima resuelve esto sin romper esa
  regla.
- **RLS probada con pgTAP, no solo "revisada a ojo"**:
  `supabase/tests/database/rls.test.sql` simula login como admin, como
  reader y como usuario sin acceso (vía `request.jwt.claim.sub` + `set
  role`, igual que hace PostgREST) y comprueba que cada uno ve exactamente
  lo que debería, nada más. Corre en CI en un Postgres real (`supabase
  start` dentro del runner), no contra una base simulada.
- **`clan_members` separa "episodios de membresía" de "snapshots"**: un
  jugador puede salir y volver a entrar al clan; cada entrada es una fila
  distinta en `clan_members` (con su propio `first_seen_at`), mientras que
  `member_snapshots` guarda el estado crudo de cada consulta del
  recolector. Así "días en el clan" y el histórico de donaciones no se
  mezclan entre dos periodos distintos de membresía del mismo jugador.
- **Proxy en vez de Middleware**: Next.js 16 renombró `middleware.ts` a
  `proxy.ts`; se usa la convención actual del framework, no la heredada.
- **Los tipos de la API de Clash of Clans están verificados contra dos
  fuentes, no solo contra memoria del modelo**: el portal
  developer.clashofclans.com no publica un archivo OpenAPI descargable, así
  que `apps/collector/src/clash-api/types.ts` se contrastó contra el
  wrapper tipado comunitario [clashofclans.js](https://clashofclans.js.org/docs/api)
  (activamente mantenido contra la API real) y, por separado, contra el
  campo `achievements` de un jugador real para confirmar que "Games
  Champion" es un contador acumulado de por vida (de ahí que fase 5 pueda
  calcular puntos de Juegos del Clan como una resta de antes/después).
- **"Días en el clan" vive en `clan_members`, no se recalcula al vuelo**:
  cada episodio de membresía guarda su propio `first_seen_at`; si alguien
  sale y vuelve, el recolector crea una fila nueva en vez de revivir la
  antigua, así que el contador de días siempre refleja la membresía
  actual, no la histórica acumulada.
- **Miembros/Ficha muestran "—" en vez de inventar números**: el índice
  0–100, las 4 barras (guerra/donaciones/capital/juegos), la media por
  ataque, el % de ataques usados y "Últimas 10 guerras" dependen de datos
  de guerra/capital/juegos (fase 4) y del paquete de reglas (fase 5), que
  todavía no existen. Donaciones, días en el clan, última actividad y el
  estado "Expulsar" por inactividad sí son reales porque sólo dependen de
  lo que el recolector ya guarda. Decisión confirmada con el usuario antes
  de construir las pantallas, para no tener que rehacerlas en fase 4/5.
- **`cacheComponents` (PPR) va desactivado en `next.config.ts`**: toda la
  app está detrás de autenticación y lee datos por clan en cada petición,
  así que no hay contenido estático que valga la pena pre-renderizar;
  activarlo solo obligaba a envolver cada página en `<Suspense>` sin
  ningún beneficio real.
- **Juegos del clan: la ventana de seguimiento es "un mes UTC", no el
  calendario real del evento**: no hay forma de saber por API cuándo
  empiezan o terminan los Juegos del Clan. El logro "Games Champion" es un
  contador acumulado de por vida que solo sube mientras el evento está
  activo, así que comparar su valor al abrir una ventana mensual contra su
  valor más reciente aísla correctamente los puntos del evento sin
  necesitar conocer sus fechas exactas — mismo principio que la detección
  de reinicio de donaciones.
- **"Última actividad" ahora también mira ataques de guerra y de
  capital**, no solo donaciones: un ataque nuevo desde la última consulta
  cuenta como actividad igual que una donación nueva (`hasNewAttacks` en
  `collect/activity.ts`).
- **Cada guerra necesita una clave estable para el upsert, pero la API solo
  da `warTag` en ligas de clanes**: para guerras normales/amistosas se
  sintetiza una (`reg:<preparationStartTime>`), así una sola restricción
  `unique (clan_id, war_tag)` sirve para los dos casos en vez de dos
  índices parciales (que `ON CONFLICT` no puede usar desde un `upsert()`
  simple).
- **El índice reparte cada categoría a 0–100 con puntos de referencia
  reutilizados, no inventados**: el prompt fija los *pesos* (guerra 40,
  donaciones 30, capital 15, juegos 15, todos editables) pero no cómo
  convertir cada estadística cruda en un 0–100. Donaciones usa el propio
  umbral editable de colíder como "nota máxima" en vez de un número mágico
  nuevo; capital y guerra usan el % de ataques utilizados; juegos usa el
  tope clásico de 4000 puntos por evento. Documentado en
  `packages/rules/src/index-score.ts`, no escondido en el código.
- **"Actividad casi diaria" (requisito de colíder) es una aproximación
  documentada, no un cálculo exacto**: el recolector solo guarda la última
  marca de actividad detectada, no un registro día a día, así que no hay
  forma de contar "cuántos días distintos estuvo activo" con el esquema
  actual. La app trata "detectada en las últimas 48 horas" como el proxy,
  explicado en `packages/rules/src/candidates.ts` y
  `lib/member-evaluation.ts`.
- **El clan ficticio reveló su propio bug**: al añadir guerra/capital/
  juegos al fixture, nadie tenía `last_activity_detected_at`, así que la
  regla de expulsión por inactividad usaba `first_seen_at` como respaldo y
  marcaba a todo el clan como "Expulsar" (días de pertenencia, no de
  inactividad real). Arreglado dándole a cada miembro ficticio una marca
  de actividad realista — dos de ellos deliberadamente antigua, para que
  el fixture siga enseñando el caso "Expulsar" que muestra el diseño.
- **El recolector se prueba contra un Postgres real, no solo con mocks**:
  `run-clan.integration.test.ts` corre dos capturas seguidas contra
  `supabase start` y comprueba entradas, salidas, reinicio de temporada de
  donaciones y detección de actividad de punta a punta. Se ejecuta aparte
  del resto de tests (`npm run test:integration --workspace=collector`,
  también en el job `db` de CI) para que `npm test` nunca necesite Docker.

## Puesta en marcha en local

Requisitos: Node 20+, Docker (para Supabase local).

```bash
npm install

# Arranca Postgres + Auth + Studio locales y aplica supabase/migrations
npx supabase start

# Copia las URLs/claves que imprime el comando anterior a apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local
# edita apps/web/.env.local con los valores de `supabase start`

npm run dev --workspace=web
```

Inicia sesión con la cuenta de ejemplo creada por `supabase/seed.sql`:
`lider@demo.test` / `demo12345`.

Hasta que configures tus propias credenciales (ver `SETUP.md`), prueba la
app con un clan ficticio en vez de la API real:

```bash
npm run seed:fixtures --workspace=collector
```

Esto crea "Clan Ficticio" (8 miembros, donaciones y roles variados) y se
lo asigna a la cuenta de ejemplo, usando exactamente las mismas funciones
de escritura que usa el recolector real — así que si el fixture se ve
bien, el recolector real también lo hará.

### Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `npm run lint` / `npm run typecheck` / `npm run test` | En los tres workspaces a la vez. |
| `npx supabase test db` | Tests pgTAP de RLS contra el Postgres local. |
| `npx supabase db reset` | Reaplica migraciones + `seed.sql` desde cero. |
| `npm run collector` | Ejecuta `apps/collector` una vez contra la API real (requiere sus variables de entorno). |
| `npm run seed:fixtures --workspace=collector` | Crea/reemplaza el clan ficticio para desarrollo local, sin clave de la API. |
| `npm run test:integration --workspace=collector` | Tests del recolector contra un Postgres local real (no solo mocks). |

## Fases

1. **Base** — repositorio, CI, esquema con RLS y cuentas. ✅
2. **Recolector** — miembros, capturas periódicas, entradas, salidas y última actividad. ✅
3. **Miembros y ficha con datos reales.** ✅
4. **Guerras, liga, capital y juegos del clan, con histórico.** ✅
5. **Reglas: expulsión, ascensos, decisiones manuales e índice.** ✅
6. **Equipo: alta de clanes con verificación del líder, invitaciones y permisos.** 🚧 en progreso — ver "Estado de la fase 6" abajo.
7. Cierre: panel, instalación en móvil, README y documentación de seguridad.

### Estado de la fase 6

Hecho y verificado con pgTAP contra Postgres real: el esquema y las
políticas de RLS para `register_clan()` (RPC que da de alta un clan y
hace admin a quien lo registra) y para `promotion_decisions`.

Hecho pero **sin verificar con un smoke test real** (a diferencia de todas
las fases anteriores) por límite de uso de la sesión que construyó esto:

- `/alta-clan`: formulario que verifica el token del jugador
  (`POST /players/{tag}/verifytoken`, confirmado contra el código fuente de
  clashofclans.js, no solo su documentación) y que su rol en el clan es
  `leader`, antes de llamar a `register_clan()`.
- `/unirse`: canje de código de invitación (reutiliza `redeem_clan_invite()`
  de la fase 1).
- `/equipo`: lista de quién tiene acceso, invitaciones pendientes y tarjeta
  para generar un código (hash SHA-256, nunca se guarda en claro).
- `packages/clash-api`: el cliente de la API se extrajo de
  `apps/collector` a un paquete compartido (`@clashleader/clash-api`)
  porque ahora `apps/web` también lo necesita, con su propio
  `verifyPlayerToken` añadido y probado.

Antes de dar la fase 6 por cerrada falta: una pasada de smoke test con
Playwright o con el mismo método de sesión-vía-cookie usado en las fases
1-5, foto de perfil (Google o iniciales), y revisar que los mensajes
"Todavía no tienes un clan" en todas las pantallas apunten bien a
`/alta-clan`.

## Limitaciones conocidas

- La API de Clash of Clans es de solo lectura y solo da el estado actual:
  todo histórico (donaciones por temporada, estrellas por guerra, última
  actividad) existe únicamente porque el recolector lo guarda en cada
  ejecución. Si el recolector lleva más de 15 minutos sin correr, esa
  ventana de historial simplemente no existe.
- "Última actividad" es una estimación (cambios en donaciones, ataques de
  guerra o capital), nunca un dato exacto de la API; la UI siempre la
  etiqueta como "sin actividad detectada".
- La API no distingue una salida voluntaria de una expulsión.
- No hay endpoint de Juegos del Clan: los puntos se calculan como la
  diferencia del logro "Games Champion" antes/después, con un tope de 4000
  impuesto por el propio juego.
- Una dependencia de desarrollo (`eslint-config-next`, a través de su
  dependencia `@next/eslint-plugin-next`) arrastra una versión de `braces`
  con un aviso de denegación de servicio por expresión regular
  (GHSA-vfj7-8cjw-p6xm). Es una dependencia de *lint*, no llega al bundle
  servido ni corre en producción; no hay una versión compatible con
  Next.js 16 que la resuelva todavía. Se revisa con cada actualización de
  Dependabot.
