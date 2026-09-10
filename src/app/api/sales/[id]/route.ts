import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mutateDispatchSalesOrder, mutateInvoiceSalesOrder } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const { id } = await context.params;

  try {
    if (body.action === "invoice") {
      const result = await mutateInvoiceSalesOrder(id);
      return NextResponse.json({
        message: result.message,
        data: { ...result.data, user },
      });
    }
    if (body.action === "dispatch") {
      const result = await mutateDispatchSalesOrder(id);
      return NextResponse.json({
        message: result.message,
        data: { ...result.data, user },
      });
    }
    return NextResponse.json({ error: "Unknown sales action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sales action failed" },
      { status: 400 }
    );
  }
}
