import { z } from "zod";

/**
 * La clave de la API de Clash of Clans va atada a una IP, así que el
 * recolector tiene que llamarla a través del proxy de RoyaleAPI (un relé
 * de IP fija) en vez de ir directo a la API. La URL base es una variable
 * de entorno, nunca hardcodeada, para poder cambiar de proxy sin tocar
 * código.
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
