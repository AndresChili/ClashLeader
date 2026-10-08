import { defineConfig } from "vitest/config";

/**
 * Runs only src/**\/*.integration.test.ts against a real local Supabase
 * (`npx supabase start`). Deliberately separate from the default `test`
 * script so plain `npm test` never needs Docker to pass.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 20_000,
  },
});
