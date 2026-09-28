import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { encryptSecret, decryptSecret } from "@postpilot/shared/crypto";

export const platformSchema = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "X",
  "TIKTOK",
]);

export type PlatformId = z.infer<typeof platformSchema>;

export const publishInputSchema = z.object({
  platform: platformSchema,
  caption: z.string(),
  mediaUrls: z.array(z.string()).default([]),
  firstComment: z.string().optional(),
  idempotencyKey: z.string(),
  accessToken: z.string().optional(),
  externalAccountId: z.string().optional(),
  dryRun: z.boolean().default(true),
});

export type PublishInput = z.infer<typeof publishInputSchema>;
export type PublishResult = {
  platformPostId: string;
  platformUrl?: string;
  dryRun: boolean;
  raw?: unknown;
};

export function encryptTokens(
  accessToken: string,
  refreshToken: string | undefined,
  keyBase64: string,
) {
  const access = encryptSecret(accessToken, keyBase64);
  const refresh = refreshToken
    ? encryptSecret(refreshToken, keyBase64)
    : null;
  return {
    accessTokenEnc: access.ciphertext,
    refreshTokenEnc: refresh?.ciphertext,
    tokenIv: access.iv,
    tokenAuthTag: access.authTag,
    tokenKeyVersion: access.keyVersion,
  };
}

export function decryptAccessToken(
  payload: {
    accessTokenEnc: string;
    tokenIv: string;
    tokenAuthTag: string;
    tokenKeyVersion: number;
  },
  keyBase64: string,
) {
  return decryptSecret(
    {
      ciphertext: payload.accessTokenEnc,
      iv: payload.tokenIv,
      authTag: payload.tokenAuthTag,
      keyVersion: payload.tokenKeyVersion,
    },
    keyBase64,
  );
}

export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const data = publishInputSchema.parse(input);
  // Official Graph API wiring lands behind this adapter. Without tokens,
  // or when dryRun=true, we simulate an idempotent publish.
  if (data.dryRun || !data.accessToken) {
    const hash = createHash("sha256")
      .update(data.idempotencyKey)
      .digest("hex")
      .slice(0, 12);
    return {
      platformPostId: `dry_${data.platform.toLowerCase()}_${hash}`,
      platformUrl: `https://example.com/${data.platform.toLowerCase()}/p/${hash}`,
      dryRun: true,
      raw: { simulated: true, captionPreview: data.caption.slice(0, 80) },
    };
  }

  // Placeholder for live Meta/LinkedIn/X/TikTok calls — never double-post:
  // callers must persist idempotencyKey before invoking.
  const id = randomUUID();
  return {
    platformPostId: id,
    platformUrl: undefined,
    dryRun: false,
    raw: { note: "Live publisher requires platform app review + tokens" },
  };
}

export const metricsTimepoints = ["H1", "H24", "H72", "D7"] as const;

export function simulateMetrics(seed: string, timepoint: string) {
  const n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const mult =
    timepoint === "H1" ? 1 : timepoint === "H24" ? 4 : timepoint === "H72" ? 7 : 12;
  return {
    reach: 200 * mult + (n % 90),
    impressions: 280 * mult + (n % 120),
    likes: 12 * mult + (n % 20),
    comments: 2 * mult + (n % 5),
    saves: 3 * mult + (n % 8),
    shares: 1 * mult + (n % 4),
    profileVisits: 5 * mult + (n % 10),
    follows: Math.max(0, mult - 1 + (n % 3)),
    views: 500 * mult + (n % 200),
  };
}
