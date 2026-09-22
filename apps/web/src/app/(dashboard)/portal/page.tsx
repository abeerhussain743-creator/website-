import { isMagicLinkValid } from "@maxtrone/core";
import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { issueParentMagicLink } from "@/actions/phase23";

export default async function PortalPage() {
  const { db } = await requireTenantContext();
  const [guardians, links] = await Promise.all([
    db.guardian.findMany({ where: { deletedAt: null }, take: 40 }),
    db.parentMagicLink.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Parent portal</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Magic links for fee status, attendance and results
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-xl">Issue link</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {guardians.slice(0, 8).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <span>{g.fullName}</span>
              <form action={issueParentMagicLink.bind(null, g.id)}>
                <Button type="submit" variant="outline">Issue</Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {links.length === 0 ? (
        <EmptyState title="No magic links" description="Issue a time-limited link a parent can open without an account." />
      ) : (
        <ul className="space-y-2 text-sm">
          {links.map((l) => {
            const valid = isMagicLinkValid({ expiresAt: l.expiresAt, usedAt: l.usedAt });
            return (
              <li key={l.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="font-medium tabular-nums break-all">
                  {appUrl}/parent/{l.token}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {valid ? "Valid" : "Expired/used"} · expires{" "}
                  {l.expiresAt.toISOString()}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
