import { z } from "zod";

/**
 * The Clash of Clans API key is IP-locked, so the collector must call it
 * through the RoyaleAPI proxy (a static-IP relay) instead of the API
 * directly. The base URL is an env var, never hardcoded, so the proxy can
 * be swapped without a code change.
 */
const configSchema = z.object({
  CLASH_API_BASE_URL: z.string().url().default("https://cocproxy.royaleapi.dev/v1"),
  CLASH_API_TOKEN: z.string().min(1, "CLASH_API_TOKEN is required"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  MAX_CLANS_PER_RUN: z.coerce.number().int().positive().default(20),
});

export type CollectorConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid collector configuration: ${issues}`);
  }
  return parsed.data;
}
