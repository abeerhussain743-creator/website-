import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma, MediaAssetKind, MediaSource } from "@postpilot/db";
import {
  templateFamilySchema,
  platformSizeSchema,
} from "@postpilot/design/catalog";
import { storageFromEnv } from "@postpilot/storage";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  family: templateFamilySchema,
  size: platformSizeSchema.default("FEED_PORTRAIT"),
  headline: z.string().min(1).max(200),
  subhead: z.string().max(200).optional(),
  body: z.string().max(600).optional(),
  cta: z.string().max(120).optional(),
  badge: z.string().max(80).optional(),
  statValue: z.string().max(24).optional(),
  statLabel: z.string().max(120).optional(),
  slides: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().optional(),
        emphasis: z.string().optional(),
      }),
    )
    .optional(),
  slideIndex: z.number().int().min(0).optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tmp = await mkdtemp(path.join(tmpdir(), "pp-design-"));
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    const [brand, kit] = await Promise.all([
      prisma.brandProfile.findUnique({ where: { workspaceId: body.workspaceId } }),
      prisma.brandKit.findFirst({
        where: { workspaceId: body.workspaceId, isPrimary: true },
        include: { logo: true },
      }),
    ]);

    if (!brand) {
      return NextResponse.json(
        { error: "Complete brand onboarding first" },
        { status: 400 },
      );
    }

    const renderInput = {
      family: body.family,
      size: body.size,
      brandKit: {
        primaryColor: kit?.primaryColor ?? "#0F3D3E",
        secondaryColor: kit?.secondaryColor ?? "#E8D5B7",
        accentColor: kit?.accentColor ?? "#D97706",
        backgroundColor: kit?.backgroundColor ?? "#FAF7F2",
        textColor: kit?.textColor ?? "#14212B",
        fontHeading: kit?.fontHeading ?? undefined,
        fontBody: kit?.fontBody ?? undefined,
        logoUrl: kit?.logo?.url ?? undefined,
      },
      content: {
        businessName: brand.businessName,
        headline: body.headline,
        subhead: body.subhead,
        body: body.body,
        cta: body.cta,
        badge: body.badge,
        statValue: body.statValue,
        statLabel: body.statLabel,
        slides: body.slides,
        slideIndex: body.slideIndex,
      },
    };

    const inputPath = path.join(tmp, "input.json");
    const outputPath = path.join(tmp, "out.png");
    await writeFile(inputPath, JSON.stringify(renderInput));

    const cli = path.resolve(
      process.cwd(),
      "../../packages/design/dist/cli-render.js",
    );
    // When cwd is apps/web, packages path is ../../packages
    const cliCandidates = [
      cli,
      path.resolve(process.cwd(), "packages/design/dist/cli-render.js"),
      path.resolve("/workspace/packages/design/dist/cli-render.js"),
    ];
    const { pathToFileURL } = await import("node:url");
    let ran = false;
    let meta = { width: 0, height: 0, family: body.family, byteSize: 0 };
    for (const candidate of cliCandidates) {
      try {
        const { stdout } = await execFileAsync(
          process.execPath,
          [candidate, inputPath, outputPath],
          { maxBuffer: 10 * 1024 * 1024 },
        );
        meta = JSON.parse(stdout || "{}");
        ran = true;
        void pathToFileURL;
        break;
      } catch {
        // try next candidate
      }
    }
    if (!ran) {
      throw new Error("Design render CLI failed to start");
    }

    const png = await readFile(outputPath);
    const storage = storageFromEnv();
    const { key, url } = await storage.putObject({
      body: png,
      contentType: "image/png",
      prefix: `workspaces/${body.workspaceId}/designs`,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        workspaceId: body.workspaceId,
        kind: MediaAssetKind.GENERATED_IMAGE,
        source: MediaSource.RENDER,
        storageKey: key,
        url,
        mimeType: "image/png",
        byteSize: png.byteLength,
        width: meta.width,
        height: meta.height,
        altText: body.headline,
        uploadedById: session.user.id,
        metaJson: {
          family: body.family,
          size: body.size,
        },
      },
    });

    return NextResponse.json({
      assetId: asset.id,
      url: asset.url,
      width: meta.width,
      height: meta.height,
      family: meta.family ?? body.family,
      byteSize: png.byteLength,
    });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", issues: err.issues },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
