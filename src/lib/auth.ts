import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  decodeSession,
  sessionUser,
  type SessionPayload,
} from "./auth-shared";
import type { User } from "./types";
import { getCompany, getRegistryUser } from "./tenancy";

export {
  SESSION_COOKIE,
  DEMO_PASSWORD,
  decodeSession,
  encodeSession,
  sessionUser,
  toPublicUser,
  userFromSessionToken,
  onboardingCompleteFromToken,
} from "./auth-shared";

export type { SessionPayload };

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return sessionUser(session);
}

export async function getSessionContext() {
  const session = await getSession();
  if (!session) return null;
  const [company, user] = await Promise.all([
    getCompany(session.companyId),
    getRegistryUser(session.companyId, session.userId),
  ]);
  if (!company || !user) return null;
  return { session, company, user, publicUser: sessionUser(session) };
}

export function buildSessionPayload(input: {
  companyId: string;
  userId: string;
  email: string;
  name: string;
  role: SessionPayload["role"];
  department: string;
  avatarInitials: string;
  onboardingCompleted: boolean;
}): SessionPayload {
  return {
    v: 1,
    companyId: input.companyId,
    userId: input.userId,
    email: input.email,
    name: input.name,
    role: input.role,
    department: input.department,
    avatarInitials: input.avatarInitials,
    onboardingCompleted: input.onboardingCompleted,
  };
}
