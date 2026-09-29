export const APP_NAME = "PostPilot";
export const APP_TAGLINE =
  "Your AI social media team: strategist, copywriter, designer, and scheduler in one.";

export const MEMBERSHIP_ROLES = [
  "OWNER",
  "ADMIN",
  "EDITOR",
  "CLIENT_APPROVER",
] as const;

export const ONBOARDING_STEPS = [
  "BUSINESS",
  "AUDIENCE",
  "TONE",
  "BRAND_KIT",
  "SOCIAL",
  "REVIEW",
  "COMPLETE",
] as const;

/** Default embedding size used with OpenAI text-embedding-3-small / compatible models. */
export const EMBEDDING_DIMENSIONS = 1536;
