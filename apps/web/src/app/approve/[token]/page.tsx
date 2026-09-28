import { createHash } from "node:crypto";
import { prisma } from "@postpilot/db";
import { approvePlannedPost, scheduleApprovedPosts } from "@postpilot/jobs";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

async function approveWeek(token: string, contentPlanId: string, workspaceId: string) {
  "use server";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const link = await prisma.approvalMagicLink.findUnique({
    where: { tokenHash },
  });
  if (!link || link.expiresAt < new Date()) {
    throw new Error("Link expired");
  }
  const posts = await prisma.plannedPost.findMany({
    where: {
      contentPlanId,
      status: { in: ["READY", "CHANGES_REQUESTED"] },
    },
  });
  for (const p of posts) {
    await approvePlannedPost({ plannedPostId: p.id, channel: "MAGIC_LINK" });
  }
  await scheduleApprovedPosts(workspaceId, contentPlanId);
  await prisma.approvalMagicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });
}

export default async function MagicApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const link = await prisma.approvalMagicLink.findUnique({
    where: { tokenHash },
  });
  if (!link || !link.contentPlanId) notFound();
  const plan = await prisma.contentPlan.findUnique({
    where: { id: link.contentPlanId },
    include: {
      posts: {
        orderBy: { dayIndex: "asc" },
        include: {
          drafts: { where: { isActive: true }, take: 1 },
          designAssets: { take: 1, orderBy: { createdAt: "desc" } },
        },
      },
      workspace: true,
    },
  });
  if (!plan) notFound();
  const expired = link.expiresAt < new Date();
  const used = Boolean(link.usedAt);

  return (
    <div className="min-h-screen bg-app-grain px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="font-display text-3xl">PostPilot</p>
        <h1 className="mt-2 text-xl font-medium">Approve this week</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {plan.workspace.name} · {plan.title}
        </p>
        {expired || used ? (
          <p className="mt-6 rounded-xl bg-amber-500/15 px-3 py-2 text-sm">
            This magic link is {expired ? "expired" : "already used"}.
          </p>
        ) : (
          <form
            className="mt-6"
            action={approveWeek.bind(null, token, plan.id, plan.workspaceId)}
          >
            <Button type="submit" className="w-full">
              Approve all & schedule
            </Button>
          </form>
        )}
        <div className="mt-8 space-y-4">
          {plan.posts.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs text-[var(--muted)]">
                Day {p.dayIndex + 1} · {p.format}
              </p>
              <p className="font-medium">{p.topic}</p>
              {p.designAssets[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.designAssets[0].url}
                  alt=""
                  className="mt-3 w-full rounded-xl"
                />
              ) : null}
              <p className="mt-2 text-sm text-[var(--muted)]">
                {p.drafts[0]?.selectedHook}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
