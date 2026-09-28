import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import {
  createDemoOAuthTokens,
  encryptTokens,
  platformSchema,
} from "@postpilot/social";

const bodySchema = z.object({
  workspaceId: z.string(),
  platform: platformSchema,
  username: z.string().min(1).max(64).optional(),
  action: z.enum(["connect_demo", "disconnect"]).default("connect_demo"),
  socialAccountId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  try {
    await assertWorkspaceAccess(session.user.id, workspaceId, "CLIENT_APPROVER");
    const accounts = await prisma.socialAccount.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        platform: true,
        status: true,
        username: true,
        displayName: true,
        profileUrl: true,
        lastSyncAt: true,
        externalAccountId: true,
        metaJson: true,
      },
    });
    return NextResponse.json({ accounts });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    if (body.action === "disconnect" && body.socialAccountId) {
      await prisma.socialAccount.update({
        where: { id: body.socialAccountId },
        data: { status: "DISCONNECTED", deletedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { workspaceId: body.workspaceId },
    });
    const username =
      body.username ||
      brand?.businessName.toLowerCase().replace(/\s+/g, "") ||
      "brand";

    const demo = createDemoOAuthTokens(body.platform, username);
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "TOKEN_ENCRYPTION_KEY missing" },
        { status: 500 },
      );
    }
    const enc = encryptTokens(demo.accessToken, demo.refreshToken, key);

    const sub = await prisma.subscription.findFirst({
      where: {
        organization: { workspaces: { some: { id: body.workspaceId } } },
      },
    });
    const existingCount = await prisma.socialAccount.count({
      where: { workspaceId: body.workspaceId, deletedAt: null },
    });
    if (sub && existingCount >= sub.platformLimit) {
      return NextResponse.json(
        { error: `Platform limit (${sub.platformLimit}) reached — upgrade plan` },
        { status: 402 },
      );
    }

    const account = await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_externalAccountId: {
          workspaceId: body.workspaceId,
          platform: body.platform,
          externalAccountId: demo.externalAccountId,
        },
      },
      create: {
        workspaceId: body.workspaceId,
        platform: body.platform,
        status: "CONNECTED",
        externalAccountId: demo.externalAccountId,
        username: demo.username,
        displayName: demo.displayName,
        profileUrl: demo.profileUrl,
        scopes: demo.scopes,
        tokenExpiresAt: demo.expiresAt,
        metaJson: { demo: true, oauth: "demo" },
        ...enc,
      },
      update: {
        status: "CONNECTED",
        deletedAt: null,
        username: demo.username,
        displayName: demo.displayName,
        profileUrl: demo.profileUrl,
        scopes: demo.scopes,
        tokenExpiresAt: demo.expiresAt,
        metaJson: { demo: true, oauth: "demo" },
        ...enc,
      },
    });

    return NextResponse.json({ account });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
