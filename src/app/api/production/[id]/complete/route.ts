import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mutateCompleteProduction } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "complete") {
    return NextResponse.json({ error: "Unknown production action" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const result = await mutateCompleteProduction(id);
    return NextResponse.json({
      message: result.message,
      data: { ...result.data, user },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Complete failed" },
      { status: 400 }
    );
  }
}
