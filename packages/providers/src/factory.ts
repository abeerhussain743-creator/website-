import { MockAIProvider } from "./ai/mock.js";
import type { AIProvider } from "./ai/types.js";
import { MockMessagingProvider } from "./messaging/mock.js";
import type { MessagingProvider } from "./messaging/types.js";
import { MockPaymentProvider } from "./payment/mock.js";
import type { PaymentProvider } from "./payment/types.js";
import { MockTTSProvider } from "./tts/mock.js";
import type { TTSProvider } from "./tts/types.js";
import { MockVoiceCallProvider } from "./voice/mock.js";
import type { VoiceCallProvider } from "./voice/types.js";

export type ProviderBundle = {
  messaging: MessagingProvider;
  ai: AIProvider;
  tts: TTSProvider;
  voice: VoiceCallProvider;
  payment: PaymentProvider;
};

export type ProviderEnv = {
  MESSAGING_PROVIDER?: string;
  AI_PROVIDER?: string;
  TTS_PROVIDER?: string;
  VOICE_CALL_PROVIDER?: string;
  PAYMENT_PROVIDER?: string;
};

/** Always safe for local/dev/tests — real adapters are added in later phases. */
export function createProviders(env: ProviderEnv = {}): ProviderBundle {
  // Non-mock env values still fall back to mocks until Phase 1 wires live adapters.
  void env;
  return {
    messaging: new MockMessagingProvider(),
    ai: new MockAIProvider(),
    tts: new MockTTSProvider(),
    voice: new MockVoiceCallProvider(),
    payment: new MockPaymentProvider(),
  };
}
