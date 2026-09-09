import { seedData } from "./seed";
import type { User } from "./types";

export const SESSION_COOKIE = "forge_session";
export const DEMO_PASSWORD = "demo1234";

export const demoUsers: Array<User & { password: string }> = [
  {
    ...seedData.user,
    password: DEMO_PASSWORD,
  },
  {
    id: "u_sales",
    name: "Sofia Nguyen",
    email: "sofia@apexmetalworks.com",
    role: "salesperson",
    department: "Sales",
    avatarInitials: "SN",
    password: DEMO_PASSWORD,
  },
  {
    id: "u_prod",
    name: "Mike Torres",
    email: "mike@apexmetalworks.com",
    role: "production_manager",
    department: "Production",
    avatarInitials: "MT",
    password: DEMO_PASSWORD,
  },
];

export function findDemoUser(email: string, password: string) {
  return demoUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
}

export function toPublicUser(user: User & { password?: string }): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatarInitials: user.avatarInitials,
  };
}

export function userFromSessionToken(token: string | undefined): User | null {
  if (!token) return null;
  const match = demoUsers.find((u) => `sess_${u.id}` === token);
  if (!match) return null;
  return toPublicUser(match);
}

export function sessionTokenFor(userId: string) {
  return `sess_${userId}`;
}
