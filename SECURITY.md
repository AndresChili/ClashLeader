# Seguridad

ClashLeader es un proyecto de portfolio, pero se trata con el mismo cuidado
que una app en producción: expone datos de terceros (miembros de un clan
real) y credenciales de cuentas reales de sus líderes.

## Reportar un problema

Si encuentras una vulnerabilidad, abre un issue privado o escribe a
andrescabreroamieva@gmail.com. No abras un issue público con detalles de
explotación.

## Cómo se cubre el OWASP Top 10 (2021)

| Riesgo | Mitigación |
| --- | --- |
| A01 Broken Access Control | RLS en todas las tablas, denegado por defecto, con tests pgTAP (`supabase/tests/database/rls.test.sql`) que prueban aislamiento entre clanes y entre roles admin/reader. Las únicas escrituras de cliente pasan por políticas o RPCs `SECURITY DEFINER` explícitos. |
| A02 Cryptographic Failures | Cookies de sesión `HttpOnly`, `Secure` en producción y `SameSite=Lax`. Los códigos de invitación se guardan como hash, nunca en texto plano. TLS siempre (Vercel + Supabase). |
| A03 Injection | Toda la escritura de usuario pasa por Supabase (consultas parametrizadas) y se valida con esquemas Zod en el servidor antes de tocar la base de datos. |
| A04 Insecure Design | El recolector es de solo lectura hacia la API de Clash of Clans y de solo escritura hacia Supabase con la clave de servicio; la app web nunca ve esa clave. Ver `docs/threat-model.md`. |
| A05 Security Misconfiguration | Cabeceras estrictas (CSP, HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`) en `apps/web/next.config.ts`. `.env.example` documenta cada variable; nada sensible en el repositorio. |
| A06 Vulnerable Components | Dependabot semanal + `npm audit --audit-level=critical` en CI. Ver "Limitaciones conocidas" en el README para la única excepción aceptada (una dependencia de desarrollo de ESLint). |
| A07 Identification and Authentication Failures | Supabase Auth (Google y correo+contraseña con verificación de correo obligatoria). Límite de intentos propio (`check_rate_limit` en Postgres) para inicio de sesión, registro, invitaciones y verificación de token de jugador. |
| A08 Software and Data Integrity Failures | CI bloquea el merge si fallan lint, tipos, tests o la auditoría de dependencias. Los workflows de GitHub Actions usan acciones ancladas por versión. |
| A09 Security Logging and Monitoring Failures | Tabla `audit_log` con quién hizo qué y cuándo (aprobaciones, descartes, notas, invitaciones, cambios de reglas). |
| A10 Server-Side Request Forgery | El recolector solo llama a una URL de proxy fija configurada por variable de entorno (`CLASH_API_BASE_URL`), nunca a una URL proporcionada por el usuario. |

## Secretos

- La clave de la API de Clash of Clans y la clave de servicio de Supabase
  solo existen en `apps/collector` y en los secretos de GitHub Actions que
  lo ejecutan. Nunca llegan al navegador ni se commitean.
- La app web (`apps/web`) solo usa la URL de Supabase y la clave anónima,
  ambas pensadas para ser públicas y protegidas por RLS.

## Alcance de este documento

Este archivo resume las mitigaciones. El razonamiento sobre qué puede salir
mal y por qué estas mitigaciones son suficientes está en
`docs/threat-model.md`.
