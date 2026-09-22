import { randomBytes } from "crypto";

export function createParentMagicToken(): string {
  return randomBytes(24).toString("hex");
}

export function magicLinkExpiresAt(from = new Date(), hours = 24): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isMagicLinkValid(input: {
  expiresAt: Date;
  usedAt?: Date | null;
  now?: Date;
}): boolean {
  if (input.usedAt) return false;
  const now = input.now ?? new Date();
  return now.getTime() < input.expiresAt.getTime();
}
