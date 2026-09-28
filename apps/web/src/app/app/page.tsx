import Link from "next/link";
import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma, OnboardingStep } from "@postpilot/db";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const brand = await prisma.brandProfile.findUnique({
    where: { workspaceId: workspace.id },
  });
  const kit = await prisma.brandKit.findFirst({
    where: { workspaceId: workspace.id, isPrimary: true },
  });

  const incomplete = workspace.onboardingStep !== OnboardingStep.COMPLETE;

  return (
    <div className="space-y-8">
      <section className="animate-fade-up">
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">
          {brand?.businessName ?? workspace.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Phase 1 foundation is live: workspaces, brand kit, and onboarding.
          Competitor research and weekly generation land in later phases.
        </p>
      </section>

      {incomplete ? (
        <section className="rounded-2xl border border-ember-500/30 bg-ember-500/10 p-5">
          <h2 className="font-medium">Finish onboarding</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Current step: {workspace.onboardingStep.replaceAll("_", " ")}
          </p>
          <Link href="/app/onboarding" className="mt-4 inline-block">
            <Button>Continue setup</Button>
          </Link>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Onboarding"
          value={incomplete ? "In progress" : "Complete"}
        />
        <Stat label="Industry" value={brand?.industry || "—"} />
        <Stat
          label="Brand colors"
          value={kit?.primaryColor ?? "Not set"}
          swatch={kit?.primaryColor ?? undefined}
        />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-display text-2xl">This week</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Content calendar, review board, and publishing appear in Phases 5–8.
          Your Brand DNA and competitor pipeline arrive in Phases 2–3.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/studio">
            <Button>Open Design Studio</Button>
          </Link>
          <Link href="/app/brand">
            <Button variant="secondary">Edit brand</Button>
          </Link>
          <Link href="/app/settings">
            <Button variant="ghost">Team & settings</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {swatch ? (
          <span
            className="h-4 w-4 rounded-full border border-black/10"
            style={{ background: swatch }}
          />
        ) : null}
        <p className="text-lg font-medium">{value}</p>
      </div>
    </div>
  );
}
