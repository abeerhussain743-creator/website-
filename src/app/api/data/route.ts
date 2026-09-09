import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readTenant, resetTenant } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await readTenant();
  return NextResponse.json({
    data: {
      ...data,
      user,
    },
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "reset") {
    const data = await resetTenant();
    return NextResponse.json({
      message: "Tenant data reset to Apex Metalworks seed",
      data: { ...data, user },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
