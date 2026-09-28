import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";

const PLANS = {
  STARTER: { creditBalance: 200, brandLimit: 1, platformLimit: 2 },
  PRO: { creditBalance: 1000, brandLimit: 3, platformLimit: 5 },
  AGENCY: { creditBalance: 5000, brandLimit: 25, platformLimit: 10 },
} as const;

const bodySchema = z.object({
  workspaceId: z.string(),
  action: z.enum(["upgrade_demo", "set_white_label", "webhook_simulate"]),
  planCode: z.enum(["STARTER", "PRO", "AGENCY"]).optional(),
  whiteLabelLogo: z.string().url().optional().nullable(),
  whiteLabelColor: z.string().max(32).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "ADMIN");
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: body.workspaceId },
      include: { organization: { include: { subscription: true } } },
    });

    if (body.action === "set_white_label") {
      const org = await prisma.organization.update({
        where: { id: workspace.organizationId },
        data: {
          whiteLabelLogo: body.whiteLabelLogo ?? undefined,
          whiteLabelColor: body.whiteLabelColor ?? undefined,
        },
      });
      return NextResponse.json({ organization: org });
    }

    const planCode = body.planCode ?? "PRO";
    const limits = PLANS[planCode];
    const stripeCustomerId = `demo_cus_${workspace.organizationId.slice(-8)}`;
    const stripeSubscriptionId = `demo_sub_${planCode.toLowerCase()}_${Date.now()}`;

    const subscription = await prisma.subscription.upsert({
      where: { organizationId: workspace.organizationId },
      create: {
        organizationId: workspace.organizationId,
        planCode,
        status: "ACTIVE",
        stripeCustomerId,
        stripeSubscriptionId,
        creditBalance: limits.creditBalance,
        brandLimit: limits.brandLimit,
        platformLimit: limits.platformLimit,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        metaJson: {
          demo: true,
          provider: process.env.STRIPE_SECRET_KEY ? "stripe+demo" : "demo",
        },
      },
      update: {
        planCode,
        status: "ACTIVE",
        stripeCustomerId,
        stripeSubscriptionId,
        creditBalance: limits.creditBalance,
        brandLimit: limits.brandLimit,
        platformLimit: limits.platformLimit,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        metaJson: {
          demo: true,
          provider: process.env.STRIPE_SECRET_KEY ? "stripe+demo" : "demo",
          action: body.action,
        },
      },
    });

    await prisma.creditLedger.create({
      data: {
        workspaceId: body.workspaceId,
        amount: limits.creditBalance,
        reason: "GRANT",
        description: `Demo ${body.action} → ${planCode}`,
        balanceAfter: limits.creditBalance,
      },
    });

    return NextResponse.json({ subscription });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Billing action failed" }, { status: 500 });
  }
}
