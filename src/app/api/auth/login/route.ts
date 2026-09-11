import { NextResponse } from "next/server";
import {
  DEMO_PASSWORD,
  SESSION_COOKIE,
  buildSessionPayload,
  encodeSession,
  toPublicUser,
} from "@/lib/auth";
import { authenticate } from "@/lib/tenancy";
import { homeForRole } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim() || "";
  const password = body.password || "";
  const auth = await authenticate(email, password);

  if (!auth) {
    return NextResponse.json(
      {
        error:
          "Invalid email or password. Create an account, or use demo jordan@apexmetalworks.com / demo1234.",
      },
      { status: 401 }
    );
  }

  const { user, company } = auth;
  const payload = buildSessionPayload({
    companyId: company.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    avatarInitials: user.avatarInitials,
    onboardingCompleted: company.onboardingCompleted,
  });

  const response = NextResponse.json({
    user: toPublicUser(user),
    company: {
      id: company.id,
      name: company.name,
      plan: company.plan,
      onboardingCompleted: company.onboardingCompleted,
    },
    redirectTo: company.onboardingCompleted
      ? homeForRole(user.role as Role)
      : "/onboarding",
    hint:
      company.id === "co_apex"
        ? `Demo workspace. Password for sample users: ${DEMO_PASSWORD}`
        : "Signed in to your Forge workspace",
  });

  response.cookies.set(SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
