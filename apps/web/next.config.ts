import type { NextConfig } from "next";

// CSP estricta: sin scripts inline, nada cargado de terceros salvo el
// propio proyecto de Supabase y los endpoints de OAuth/avatar de Google.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://accounts.google.com`,
  "img-src 'self' data: https://lh3.googleusercontent.com",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Cache Components (shells estáticos al estilo PPR) no aporta nada aquí:
  // toda ruta está detrás de autenticación y lee datos por clan, así que
  // no hay contenido estático que valga la pena pre-renderizar — solo
  // boilerplate de Suspense sin ningún beneficio real. Ver README
  // "Decisiones técnicas".
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
