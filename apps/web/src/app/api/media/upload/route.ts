import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma, MediaAssetKind, MediaSource } from "@postpilot/db";
import { storageFromEnv } from "@postpilot/storage";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const workspaceId = String(form.get("workspaceId") ?? "");
    const file = form.get("file");
    if (!workspaceId || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    await assertWorkspaceAccess(session.user.id, workspaceId, "EDITOR");

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = storageFromEnv();
    const { key, url } = await storage.putObject({
      body: buffer,
      contentType: file.type,
      prefix: `workspaces/${workspaceId}/logos`,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        kind: MediaAssetKind.LOGO,
        source: MediaSource.UPLOAD,
        storageKey: key,
        url,
        mimeType: file.type,
        byteSize: file.size,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ id: asset.id, url: asset.url, key });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Upload failed. Is MinIO running?" },
      { status: 500 },
    );
  }
}
