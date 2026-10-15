import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  EVE_CLIENT_ID: z.string().min(1),
  EVE_CLIENT_SECRET: z.string().min(1),
  EVE_CALLBACK_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  ESI_USER_AGENT: z.string().min(1).default("eve-pi/0.1.0 (local; +https://github.com/eve-pi)"),
  ESI_COMPATIBILITY_DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  APP_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

/** API “date” rolls at 11:00 UTC per ESI docs. */
export function getCompatibilityDate(): string {
  const env = getEnv();
  if (env.ESI_COMPATIBILITY_DATE) return env.ESI_COMPATIBILITY_DATE;
  const now = new Date();
  const shifted = new Date(now.getTime() - 11 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}
