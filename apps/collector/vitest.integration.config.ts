import { defineConfig } from "vitest/config";

/**
 * Corre solo src/**\/*.integration.test.ts contra un Supabase local real
 * (`npx supabase start`). Separado a propósito del script `test` por
 * defecto, para que `npm test` nunca necesite Docker para pasar.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 20_000,
  },
});
