import type { Role, User } from "./types";

export const SESSION_COOKIE = "forge_session";
export const DEMO_PASSWORD = "demo1234";

export type SessionPayload = {
  v: 1;
  companyId: string;
  userId: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  avatarInitials: string;
  onboardingCompleted: boolean;
};

function toBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSession(payload: SessionPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  try {
    if (token.startsWith("sess_")) return null;
    const parsed = JSON.parse(fromBase64Url(token)) as SessionPayload;
    if (parsed.v !== 1 || !parsed.companyId || !parsed.userId || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sessionUser(payload: SessionPayload): User {
  return {
    id: payload.userId,
    companyId: payload.companyId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    department: payload.department,
    avatarInitials: payload.avatarInitials,
  };
}

export function toPublicUser(user: User & { password?: string; passwordHash?: string }): User {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatarInitials: user.avatarInitials,
  };
}

/** Edge-safe: only validates cookie shape (no filesystem). */
export function userFromSessionToken(token: string | undefined): User | null {
  const payload = decodeSession(token);
  if (!payload) return null;
  return sessionUser(payload);
}

export function onboardingCompleteFromToken(token: string | undefined): boolean {
  return Boolean(decodeSession(token)?.onboardingCompleted);
}
