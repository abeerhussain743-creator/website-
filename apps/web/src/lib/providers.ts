import { createProviders } from "@maxtrone/providers";

const globalForProviders = globalThis as unknown as {
  providers?: ReturnType<typeof createProviders>;
};

export function getProviders() {
  if (!globalForProviders.providers) {
    globalForProviders.providers = createProviders({
      MESSAGING_PROVIDER: process.env.MESSAGING_PROVIDER,
      AI_PROVIDER: process.env.AI_PROVIDER,
      TTS_PROVIDER: process.env.TTS_PROVIDER,
      VOICE_CALL_PROVIDER: process.env.VOICE_CALL_PROVIDER,
      PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    });
  }
  return globalForProviders.providers;
}
