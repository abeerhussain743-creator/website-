import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import { ReviewActions } from "@/components/review/actions";

export default async function ReviewPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const plan = await prisma.contentPlan.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      posts: {
        orderBy: { dayIndex: "asc" },
        include: {
          drafts: { where: { isActive: true }, take: 1 },
          designAssets: { orderBy: { createdAt: "desc" }, take: 1 },
          comments: { orderBy: { createdAt: "desc" }, take: 3 },
        },
      },
    },
  });

  const latestRun = await prisma.pipelineRun.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });
  const notifyStep = Array.isArray(latestRun?.stepsJson)
    ? (latestRun!.stepsJson as Array<{ step?: string; detail?: { approveUrl?: string } }>).find(
        (s) => s.step === "NOTIFY_FOR_APPROVAL",
      )
    : null;
  const approveUrl = notifyStep?.detail?.approveUrl;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Review board</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Approve, request changes, or publish. Nothing goes live without approval
            unless auto-approve is on.
          </p>
        </div>
        {plan ? (
          <ReviewActions
            workspaceId={workspace.id}
            contentPlanId={plan.id}
          />
        ) : null}
      </div>

      {approveUrl ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium">Client magic link</p>
          <p className="mt-1 break-all text-[var(--muted)]">{approveUrl}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Also delivered via console / Resend / WhatsApp when configured.
          </p>
        </div>
      ) : null}

      {!plan ? (
        <p className="text-sm text-[var(--muted)]">
          No plan yet. Generate next week from the dashboard.
        </p>
      ) : (
        <>
          <p className="text-sm">
            {plan.title} · <span className="text-[var(--muted)]">{plan.status}</span>
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.posts.map((post) => {
              const draft = post.drafts[0];
              const design = post.designAssets[0];
              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-[var(--muted)]">
                        Day {post.dayIndex + 1} · {post.format}
                      </p>
                      <h2 className="mt-1 font-medium">{post.topic}</h2>
                    </div>
                    <span className="rounded-full bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">
                      {post.status}
                    </span>
                  </div>
                  {design?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.url}
                      alt={draft?.altText ?? post.topic ?? "Post"}
                      className="mt-3 aspect-[4/5] w-full rounded-xl object-cover"
                    />
                  ) : null}
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
                    {draft?.caption?.slice(0, 280) ?? "No caption yet"}
                  </p>
                  {post.comments[0] ? (
                    <p className="mt-2 rounded-lg bg-ink-100/60 px-2 py-1 text-xs dark:bg-ink-800/60">
                      Feedback: {post.comments[0].body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Quality{" "}
                    {(draft?.qualityScores as { overall?: number } | null)?.overall ??
                      "—"}
                    /100 ·{" "}
                    {post.targetPublishAt
                      ? new Date(post.targetPublishAt).toLocaleString()
                      : "unscheduled"}
                  </p>
                  <div className="mt-3">
                    <ReviewActions
                      workspaceId={workspace.id}
                      contentPlanId={plan.id}
                      plannedPostId={post.id}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
