import { requireSession } from "@/lib/tenant";
import { prisma } from "@maxtrone/db";
import { redirect } from "next/navigation";
import { formatPkr } from "@maxtrone/core";

export default async function SuperAdminPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isSuperAdmin) redirect("/dashboard");

  const tenants = await prisma.institution.findMany({
    include: {
      plan: true,
      _count: { select: { students: true } },
      usageMeters: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Super-admin</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Tenants · plans · usage metering
        </p>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Usage</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium">
                  {t.name}
                  <span className="block text-xs text-[var(--muted-foreground)]">{t.slug}</span>
                </td>
                <td className="px-4 py-3">{t.plan.code}</td>
                <td className="px-4 py-3">{t.status}</td>
                <td className="px-4 py-3 tabular-nums">{t._count.students}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  {t.usageMeters.length
                    ? t.usageMeters.map((u) => `${u.metric}:${u.quantity}`).join(" · ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        SaaS billing in PKR is recorded manually (no Stripe). Impersonation is audited via API.
        {formatPkr(0) ? "" : ""}
      </p>
    </div>
  );
}
