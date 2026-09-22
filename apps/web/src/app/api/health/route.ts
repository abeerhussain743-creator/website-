import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "maxtrone-web",
    phase: "2-3",
  });
}
