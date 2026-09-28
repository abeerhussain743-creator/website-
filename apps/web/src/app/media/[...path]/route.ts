import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const relative = parts.join("/");
  if (relative.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const root = path.resolve(process.env.STORAGE_LOCAL_ROOT ?? "./uploads");
  const full = path.join(root, relative);
  if (!full.startsWith(root)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const data = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".svg"
              ? "image/svg+xml"
              : "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
