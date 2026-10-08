# SETUP.md — pasos que tienes que hacer tú

Este asistente no tiene acceso a tus cuentas (Supabase, Google, Clash of
Clans, GitHub, Vercel). Hasta que completes estos pasos, la app funciona en
local con los datos ficticios de `supabase/seed.sql` (y, a partir de la
fase 2, con el script de datos de ejemplo del recolector).

## 1. Crear el proyecto de Supabase

1. Entra en [supabase.com](https://supabase.com) con
   `andrescabreroamieva@gmail.com` y crea un proyecto nuevo (región
   cercana a tus usuarios, por ejemplo `eu-central-1`).
2. Guarda la contraseña de la base de datos que te pida generar: la
   necesitarás para `supabase link` y migraciones remotas.
3. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` (en `apps/web`) y
     `SUPABASE_URL` (en `apps/collector`).
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`. **No la pongas
     nunca en `apps/web`, solo en `apps/collector` y en el secreto de
     GitHub Actions del paso 4.**
4. En **Authentication → Providers → Email**, activa "Confirm email"
   (verificación de correo obligatoria, ya la pide el esquema).
5. Enlaza tu repositorio local al proyecto y despliega las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```

   `supabase/migrations/` contiene todo el esquema y las políticas de RLS;
   no hace falta tocar nada desde el panel de Supabase.

## 2. Credenciales de Google (inicio de sesión con Google)

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   crea un proyecto (o reutiliza uno) y una credencial **OAuth 2.0 Client
   ID** de tipo "Web application".
2. En **Authorized redirect URIs** añade la URL de callback que te muestra
   Supabase en **Authentication → Providers → Google** (tiene la forma
   `https://<tu-project-ref>.supabase.co/auth/v1/callback`).
3. Copia el **Client ID** y el **Client Secret** al panel de Supabase, en
   ese mismo proveedor Google, y actívalo.
4. No hace falta ninguna variable de entorno adicional en `apps/web` para
   esto: Supabase Auth gestiona el intercambio OAuth.

## 3. Clave de la API de Clash of Clans

1. Entra en [developer.clashofclans.com](https://developer.clashofclans.com)
   con una cuenta de Supercell ID.
2. Crea una clave nueva ("Create New Key") y, en **Allowed IP addresses**,
   pon exactamente: `45.79.218.79` (la IP fija del proxy de RoyaleAPI, no
   la tuya).
3. Copia la clave a `CLASH_API_TOKEN` en `apps/collector/.env.local` (para
   pruebas locales) y como secreto de GitHub Actions (paso 4, para el
   workflow programado).
4. No cambies `CLASH_API_BASE_URL`: ya apunta a
   `https://cocproxy.royaleapi.dev/v1`, que reenvía a la API oficial desde
   esa IP.

## 4. Secretos de GitHub Actions (recolector programado)

En **Settings → Secrets and variables → Actions** del repositorio
`AndresChili/ClashLeader`, añade:

| Secreto | Valor |
| --- | --- |
| `CLASH_API_TOKEN` | La clave del paso 3. |
| `SUPABASE_URL` | El `Project URL` del paso 1. |
| `SUPABASE_SERVICE_ROLE_KEY` | La `service_role` key del paso 1. |

El workflow programado (`.github/workflows/collector.yml`) correrá cada 15
minutos usando estos tres secretos; no necesita nada más. Hasta que los
configures, las ejecuciones programadas fallarán al validar la
configuración (ver `apps/collector/src/config.ts`) — no pasa nada, no
tocan tu base de datos hasta que las credenciales sean válidas.

## 5. Conexión con Vercel

1. En [vercel.com](https://vercel.com), importa el repositorio
   `AndresChili/ClashLeader`.
2. **Root Directory**: `apps/web` (el monorepo tiene más de una app; Vercel
   solo despliega la web).
3. En **Environment Variables**, añade `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL` (la URL pública
   que te asigne Vercel, o tu dominio si usas uno propio) — los mismos
   valores del paso 1, nunca la `service_role` key.
4. Despliega. El build usa `npm run build --workspace=web` automáticamente
   si Vercel detecta el `package.json` de `apps/web`; si no, configúralo a
   mano en **Build & Development Settings**.

## Resumen de dónde vive cada secreto

| Secreto | apps/web (Vercel) | apps/collector (GitHub Actions) | Navegador |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | ✅ (pensada para esto, protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ nunca | ✅ | ❌ nunca |
| `CLASH_API_TOKEN` | ❌ nunca | ✅ | ❌ nunca |

Si en algún momento ves alguna de estas claves en una respuesta de red del
navegador o en un commit, es un bug de seguridad: repórtalo según
`SECURITY.md` y rota la clave afectada inmediatamente desde el panel
correspondiente (Supabase o developer.clashofclans.com).
