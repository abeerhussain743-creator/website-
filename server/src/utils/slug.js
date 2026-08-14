import slugify from 'slugify';
import { randomBytes } from 'crypto';

export function makeSlug(text) {
  const base = slugify(text || 'proposal', { lower: true, strict: true });
  const suffix = randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

export function makeToken() {
  return randomBytes(24).toString('hex');
}

export function makeInviteCode() {
  return randomBytes(4).toString('hex');
}
