import { cookies } from "next/headers";
import { SESSION_COOKIE, userFromSessionToken } from "./auth-shared";
import type { User } from "./types";

export {
  SESSION_COOKIE,
  DEMO_PASSWORD,
  demoUsers,
  findDemoUser,
  sessionTokenFor,
  toPublicUser,
  userFromSessionToken,
} from "./auth-shared";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  return userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
}
