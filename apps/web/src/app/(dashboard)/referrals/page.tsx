import { referralWhatsAppShare } from "@maxtrone/core";
import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { createReferralForGuardian } from "@/actions/phase23";
import { formatPkr } from "@maxtrone/core";

export default async function ReferralsPage() {
  const { db, institution } = await requireTenantContext();
  const [referrals, guardians] = await Promise.all([
    db.referral.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.guardian.findMany({ where: { deletedAt: null }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Referrals</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Parent referral codes for admissions growth
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Issue code</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {guardians.slice(0, 6).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <span>{g.fullName}</span>
              <form action={createReferralForGuardian.bind(null, g.id)}>
                <Button type="submit" variant="outline">Create</Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {referrals.length === 0 ? (
        <EmptyState title="No referral codes" description="Create a code for a guardian to share on WhatsApp." />
      ) : (
        <ul className="space-y-3">
          {referrals.map((r) => (
            <li key={r.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <p className="font-medium tabular-nums">{r.code}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                Reward {formatPkr(r.rewardPaisa)} · used {r.uses}×
              </p>
              <p className="mt-2 text-xs">
                {referralWhatsAppShare({
                  institutionName: institution.name,
                  code: r.code,
                  rewardNote: `Fee credit ${formatPkr(r.rewardPaisa)} on admission.`,
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
