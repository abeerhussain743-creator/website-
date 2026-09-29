import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma, MediaAssetKind, MediaSource } from "@postpilot/db";
import { generateImage } from "@postpilot/ai";
import { storageFromEnv } from "@postpilot/storage";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  prompt: z.string().min(3).max(1200),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    const kit = await prisma.brandKit.findFirst({
      where: { workspaceId: body.workspaceId, isPrimary: true },
    });
    const colors = [
      kit?.primaryColor,
      kit?.secondaryColor,
      kit?.accentColor,
    ].filter((c): c is string => Boolean(c));

    const image = await generateImage({
      prompt: body.prompt,
      width: body.width ?? 1080,
      height: body.height ?? 1350,
      brandColors: colors,
    });

    let storedUrl = image.url;
    let storageKey: string | undefined;
    // Persist remote fal URLs into our storage when possible
    if (image.url.startsWith("http")) {
      try {
        const res = await fetch(image.url, { signal: AbortSignal.timeout(30_000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const storage = storageFromEnv();
          const put = await storage.putObject({
            body: buf,
            contentType: res.headers.get("content-type") || "image/jpeg",
            prefix: `workspaces/${body.workspaceId}/ai-images`,
          });
          storedUrl = put.url;
          storageKey = put.key;
        }
      } catch (err) {
        console.error("[studio/image] persist failed", err);
      }
    }

    if (storageKey) {
      await prisma.mediaAsset.create({
        data: {
          workspaceId: body.workspaceId,
          kind: MediaAssetKind.GENERATED_IMAGE,
          source: MediaSource.AI_GENERATED,
          storageKey,
          url: storedUrl,
          mimeType: "image/jpeg",
          width: body.width ?? 1080,
          height: body.height ?? 1350,
          altText: body.prompt.slice(0, 160),
          metaJson: { provider: image.provider, prompt: image.prompt },
        },
      });
    }

    await prisma.aICallLog.create({
      data: {
        workspaceId: body.workspaceId,
        provider: image.provider.startsWith("fal") ? "FAL" : "OTHER",
        kind: "IMAGE",
        model: image.provider,
        success: true,
        imageCount: 1,
        metaJson: { prompt: body.prompt.slice(0, 200) },
      },
    });

    return NextResponse.json({
      url: storedUrl,
      provider: image.provider,
      prompt: image.prompt,
    });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
