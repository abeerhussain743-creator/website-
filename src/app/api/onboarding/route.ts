import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  buildSessionPayload,
  encodeSession,
  getSessionContext,
  toPublicUser,
} from "@/lib/auth";
import { completeOnboarding } from "@/lib/tenancy";
import type { PlanId, Role } from "@/lib/types";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: toPublicUser(ctx.user),
    company: ctx.company,
  });
}

export async function POST(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    companyName?: string;
    industry?: string;
    plantName?: string;
    plan?: PlanId;
    country?: string;
    employeeBand?: string;
    inviteEmail?: string;
    inviteName?: string;
    inviteRole?: Role;
  };

  try {
    const result = await completeOnboarding(ctx.company.id, body);
    const payload = buildSessionPayload({
      companyId: result.company.id,
      userId: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
      department: ctx.user.department,
      avatarInitials: ctx.user.avatarInitials,
      onboardingCompleted: true,
    });

    const response = NextResponse.json({
      message: "Onboarding complete. Your manufacturing workspace is ready.",
      company: result.company,
      data: { ...result.tenant, user: toPublicUser(ctx.user) },
      redirectTo: "/app",
    });

    response.cookies.set(SESSION_COOKIE, encodeSession(payload), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding failed" },
      { status: 400 }
    );
  }
}
