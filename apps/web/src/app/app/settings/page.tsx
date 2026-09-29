import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import {
  BillingControls,
  ConnectedAccounts,
} from "@/components/settings/accounts-billing";

export default async function SettingsPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const memberships = await getUserMembershipsSafe(session.user.id);
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: workspace.organizationId },
  });
  const org = await prisma.organization.findUnique({
    where: { id: workspace.organizationId },
  });
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Accounts, billing (demo Stripe), white-label, and workspace.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Connected accounts</h2>
        <div className="mt-4">
          <ConnectedAccounts
            workspaceId={workspace.id}
            initial={accounts.map((a) => ({
              id: a.id,
              platform: a.platform,
              status: a.status,
              username: a.username,
              displayName: a.displayName,
            }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Workspace</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Name" value={workspace.name} />
          <Row label="Slug" value={workspace.slug} />
          <Row label="Timezone" value={workspace.timezone} />
          <Row
            label="Languages"
            value={workspace.contentLanguages.join(", ")}
          />
          <Row label="Auto-approve" value={workspace.autoApprove ? "On" : "Off"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Agency / white-label</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Organization" value={org?.name ?? "—"} />
          <Row label="Accent" value={org?.whiteLabelColor ?? "default"} />
          <Row label="Custom domain" value={org?.customDomain ?? "—"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Memberships</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {memberships.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
            >
              <span>{m.organization.name}</span>
              <span className="text-[var(--muted)]">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Plan & credits</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Code" value={subscription?.planCode ?? "STARTER"} />
          <Row label="Status" value={subscription?.status ?? "TRIALING"} />
          <Row
            label="Credits"
            value={String(subscription?.creditBalance ?? 0)}
          />
          <Row
            label="Brand limit"
            value={String(subscription?.brandLimit ?? 1)}
          />
          <Row
            label="Platform limit"
            value={String(subscription?.platformLimit ?? 2)}
          />
        </dl>
        <BillingControls
          workspaceId={workspace.id}
          planCode={subscription?.planCode ?? "STARTER"}
        />
      </section>
    </div>
  );
}

async function getUserMembershipsSafe(userId: string) {
  const { getUserMemberships } = await import("@/lib/access");
  return getUserMemberships(userId);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
