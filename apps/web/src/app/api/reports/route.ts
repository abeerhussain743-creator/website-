import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { buildWeeklyReport } from "@postpilot/jobs";
import { prisma } from "@postpilot/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = z.object({ workspaceId: z.string() }).parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");
    const report = await buildWeeklyReport(body.workspaceId);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  try {
    await assertWorkspaceAccess(session.user.id, workspaceId);
    let report = await prisma.weeklyReport.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    if (!report) report = await buildWeeklyReport(workspaceId);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
