import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mutateSupervisorEntry } from "@/lib/db";
import type { SupervisorAction } from "@/lib/supervisor";
import { desksForRole, isOwnerLike } from "@/lib/permissions";

const ACTION_DESK: Record<SupervisorAction["action"], string> = {
  create_customer: "sales",
  create_quotation: "sales",
  create_supplier: "purchase",
  create_purchase_order: "purchase",
  create_product: "inventory",
  adjust_stock: "inventory",
  create_production_order: "production",
  update_work_order: "production",
  create_quality_check: "quality",
  update_bin_location: "warehouse",
  create_invoice_entry: "accounts",
  create_employee: "hr",
  update_employee_status: "hr",
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SupervisorAction | null;
  if (!body?.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const desk = ACTION_DESK[body.action];
  const allowed = desksForRole(user.role);
  if (!isOwnerLike(user.role) && !allowed.includes(desk as (typeof allowed)[number])) {
    return NextResponse.json(
      { error: `Your role cannot submit ${desk} entries` },
      { status: 403 }
    );
  }

  try {
    const result = await mutateSupervisorEntry(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save entry" },
      { status: 400 }
    );
  }
}
