/** Phase 4: platform OAuth, publish, and analytics adapters. */
export type PlatformId =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "LINKEDIN"
  | "X"
  | "TIKTOK";

export interface SocialPublisher {
  readonly platform: PlatformId;
  publish(input: unknown): Promise<{ platformPostId: string }>;
}

export function assertPhase4(): never {
  throw new Error("@postpilot/social is not implemented until Phase 4");
}
