import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("Maxtrone Campus"),
  AI_PROVIDER: z.enum(["mock", "anthropic", "openai"]).default("mock"),
  AI_DEFAULT_MODEL: z.string().default("claude-sonnet-4-20250514"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MESSAGING_PROVIDER: z.enum(["mock", "whatsapp"]).default("mock"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  TTS_PROVIDER: z.enum(["mock", "azure", "elevenlabs"]).default("mock"),
  VOICE_CALL_PROVIDER: z.enum(["mock", "vapi"]).default("mock"),
  VAPI_API_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(["mock", "jazzcash", "easypaisa"]).default("mock"),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}
