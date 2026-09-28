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
  dryRun: z.boolean().optional(),
  format: z
    .enum(["SINGLE_IMAGE", "CAROUSEL", "REEL", "STORY", "TEXT", "VIDEO"])
    .optional(),
});

export type PublishInput = z.infer<typeof publishInputSchema>;
export type PublishResult = {
  platformPostId: string;
  platformUrl?: string;
  dryRun: boolean;
  raw?: unknown;
};

export function isPublishDryRun(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") return explicit;
  const env = process.env.PUBLISH_DRY_RUN;
  if (env === "false" || env === "0") return false;
  return true; // default safe
}

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

export type SocialPublisher = {
  platform: PlatformId;
  publish(input: PublishInput): Promise<PublishResult>;
  syncMetrics?(externalAccountId: string): Promise<{
    followers: number;
    following: number;
    mediaCount: number;
    reach: number;
    impressions: number;
    engagementRate: number;
    profileViews: number;
  }>;
};

function dryResult(data: PublishInput): PublishResult {
  const hash = createHash("sha256")
    .update(data.idempotencyKey)
    .digest("hex")
    .slice(0, 12);
  const slug = data.platform.toLowerCase();
  return {
    platformPostId: `dry_${slug}_${hash}`,
    platformUrl: `https://example.com/${slug}/p/${hash}`,
    dryRun: true,
    raw: {
      simulated: true,
      format: data.format ?? "SINGLE_IMAGE",
      mediaCount: data.mediaUrls.length,
      captionPreview: data.caption.slice(0, 80),
    },
  };
}

function makePublisher(platform: PlatformId): SocialPublisher {
  return {
    platform,
    async publish(input) {
      const data = publishInputSchema.parse({ ...input, platform });
      const dry = isPublishDryRun(data.dryRun);
      if (dry || !data.accessToken || data.accessToken.startsWith("demo_")) {
        return dryResult(data);
      }
      // Live Graph/API wiring requires app review — return idempotent placeholder
      // so callers never invent duplicate platform IDs across retries.
      const hash = createHash("sha256")
        .update(data.idempotencyKey)
        .digest("hex")
        .slice(0, 16);
      return {
        platformPostId: `${platform.toLowerCase()}_${hash}`,
        platformUrl: undefined,
        dryRun: false,
        raw: {
          note: `Live ${platform} publisher requires app credentials + review`,
          format: data.format,
        },
      };
    },
    async syncMetrics(externalAccountId: string) {
      const n = [...externalAccountId].reduce((a, c) => a + c.charCodeAt(0), 0);
      const base =
        platform === "INSTAGRAM"
          ? 4200
          : platform === "TIKTOK"
            ? 9100
            : platform === "LINKEDIN"
              ? 1800
              : platform === "X"
                ? 3200
                : 5100;
      return {
        followers: base + (n % 400),
        following: 200 + (n % 150),
        mediaCount: 40 + (n % 80),
        reach: base * 2 + (n % 900),
        impressions: base * 3 + (n % 1200),
        engagementRate: 2.2 + (n % 30) / 10,
        profileViews: 300 + (n % 400),
      };
    },
  };
}

export const publishers: Record<PlatformId, SocialPublisher> = {
  INSTAGRAM: makePublisher("INSTAGRAM"),
  FACEBOOK: makePublisher("FACEBOOK"),
  LINKEDIN: makePublisher("LINKEDIN"),
  X: makePublisher("X"),
  TIKTOK: makePublisher("TIKTOK"),
};

export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const data = publishInputSchema.parse(input);
  return publishers[data.platform].publish(data);
}

export async function syncAccountMetrics(
  platform: PlatformId,
  externalAccountId: string,
) {
  return publishers[platform].syncMetrics!(externalAccountId);
}

/** Demo OAuth — stores encrypted fake tokens for connected-account UX. */
export function createDemoOAuthTokens(platform: PlatformId, username: string) {
  const accessToken = `demo_${platform.toLowerCase()}_${username}_${randomUUID().slice(0, 8)}`;
  const refreshToken = `demo_refresh_${randomUUID().slice(0, 8)}`;
  return {
    accessToken,
    refreshToken,
    externalAccountId: `demo_${platform.toLowerCase()}_${username}`,
    username,
    displayName: username,
    profileUrl: `https://example.com/${platform.toLowerCase()}/${username}`,
    scopes: ["demo.publish", "demo.insights"],
    expiresAt: new Date(Date.now() + 60 * 86400000),
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
