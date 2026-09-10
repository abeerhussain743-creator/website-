import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  mutateAnalyze,
  mutateApprove,
  mutateAsk,
  mutateAutoExecute,
  mutateExecute,
  mutateOverride,
  mutateReject,
  mutateRunRules,
  mutateUpdateSettings,
  readTenant,
} from "@/lib/db";

async function guard() {
  const user = await getSessionUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readTenant();
  return NextResponse.json({
    data: { ...data, user },
    openDecisions: data.decisions.filter((d) =>
      ["proposed", "approved"].includes(d.status)
    ).length,
  });
}

export async function POST(request: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    decisionId?: string;
    question?: string;
    settings?: Record<string, boolean>;
  };

  try {
    switch (body.action) {
      case "run_rules": {
        const result = await mutateRunRules();
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "analyze": {
        const result = await mutateAnalyze();
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "ask": {
        const result = await mutateAsk(body.question || "Give me an operating brief");
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "approve": {
        const result = await mutateApprove(String(body.decisionId));
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "reject": {
        const result = await mutateReject(String(body.decisionId));
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "execute": {
        const result = await mutateExecute(String(body.decisionId));
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "override": {
        const result = await mutateOverride(String(body.decisionId));
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "auto_execute": {
        const result = await mutateAutoExecute();
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      case "update_settings": {
        const result = await mutateUpdateSettings(body.settings ?? {});
        return NextResponse.json({ ...result, data: { ...result.data, user } });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decision action failed" },
      { status: 400 }
    );
  }
}
