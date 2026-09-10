import { NextResponse } from "next/server";
import { getSessionContext, toPublicUser } from "@/lib/auth";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: toPublicUser(ctx.user),
    company: {
      id: ctx.company.id,
      name: ctx.company.name,
      plan: ctx.company.plan,
      onboardingCompleted: ctx.company.onboardingCompleted,
      industry: ctx.company.industry,
    },
  });
}
