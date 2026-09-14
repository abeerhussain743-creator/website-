import { NextResponse } from "next/server";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  return NextResponse.json({
    ok: database === "ok",
    service: "shopdata-web",
    database,
    timestamp: new Date().toISOString(),
  });
}
