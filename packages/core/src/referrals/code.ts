export type ReferralCodeParts = {
  institutionSlug: string;
  guardianId: string;
};

export function buildReferralCode(parts: ReferralCodeParts): string {
  const short = parts.guardianId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${parts.institutionSlug.slice(0, 8).toUpperCase()}-${short}`;
}

export function referralWhatsAppShare(input: {
  institutionName: string;
  code: string;
  rewardNote?: string;
}): string {
  const reward = input.rewardNote ?? "Share this code when a friend admits.";
  return `Join ${input.institutionName} with my referral code ${input.code}. ${reward}`;
}
