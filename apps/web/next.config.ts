import type { NextConfig } from "next";

// El Content-Security-Policy se genera por petición en src/proxy.ts (con
// nonce), no aquí: Next.js inyecta sus propios <script> inline para
// hidratar React, y sin nonce el navegador los bloquea y la app entera
// se queda sin hidratar. Un CSP estático no puede llevar nonce.
const securityHeaders = [
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
