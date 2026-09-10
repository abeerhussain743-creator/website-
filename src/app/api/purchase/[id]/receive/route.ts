import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mutateReceivePurchase } from "@/lib/db";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const result = await mutateReceivePurchase(id);
    return NextResponse.json({
      message: result.message,
      data: { ...result.data, user },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receive failed" },
      { status: 400 }
    );
  }
}
