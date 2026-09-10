import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  buildSessionPayload,
  encodeSession,
  toPublicUser,
} from "@/lib/auth";
import { signupCompany } from "@/lib/tenancy";
import type { PlanId } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    companyName?: string;
    industry?: string;
    plantName?: string;
    country?: string;
    employeeBand?: string;
    plan?: PlanId;
    ownerName?: string;
    ownerEmail?: string;
    password?: string;
    withSampleData?: boolean;
  };

  try {
    const result = await signupCompany({
      companyName: body.companyName || "",
      industry: body.industry || "Manufacturing",
      plantName: body.plantName || "Main Plant",
      country: body.country,
      employeeBand: body.employeeBand,
      plan: body.plan || "starter",
      ownerName: body.ownerName || "",
      ownerEmail: body.ownerEmail || "",
      password: body.password || "",
      withSampleData: Boolean(body.withSampleData),
    });

    const payload = buildSessionPayload({
      companyId: result.company.id,
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      department: result.user.department,
      avatarInitials: result.user.avatarInitials,
      onboardingCompleted: false,
    });

    const response = NextResponse.json({
      user: toPublicUser(result.user),
      company: {
        id: result.company.id,
        name: result.company.name,
        plan: result.company.plan,
        onboardingCompleted: false,
      },
      redirectTo: "/onboarding",
      message: "Workspace created. Finish onboarding to enter Forge.",
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
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}
