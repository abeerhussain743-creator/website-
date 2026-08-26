"use client";

import { TopBar } from "@/components/layout/TopBar";
import { PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { roleLabels } from "@/lib/format";

const roleMatrix: { role: string; access: string }[] = [
  { role: "Owner", access: "Everything" },
  { role: "Admin", access: "Everything except critical financial settings" },
  { role: "Sales Manager", access: "Sales + CRM" },
  { role: "Salesperson", access: "Assigned customers" },
  { role: "Purchase Manager", access: "Purchasing" },
  { role: "Store Manager", access: "Inventory" },
  { role: "Production Manager", access: "Production" },
  { role: "QC Manager", access: "Quality" },
  { role: "Accountant", access: "Finance" },
  { role: "HR Manager", access: "HR" },
  { role: "Worker", access: "Assigned work orders" },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$99–149/mo",
    blurb: "Single-plant sales, inventory, production basics",
  },
  {
    id: "growth",
    name: "Growth",
    price: "$299–499/mo",
    blurb: "Multi-department ops + basic accounts",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$799–1,499/mo",
    blurb: "QC, warehouse, costing, advanced reports",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    blurb: "Multi-plant, SSO, API, premium AI",
  },
];

export default function SettingsPage() {
  const { data } = useForge();

  return (
    <div className="fade-up">
      <TopBar
        title="Admin & Settings"
        subtitle="Tenant, plan, plants, and role-based access for the manufacturing OS."
      />
      <PageHeaderNote>
        Multi-tenant foundation · Each company gets isolated users, products, inventory, sales, and
        finance.
      </PageHeaderNote>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Company">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Name</dt>
              <dd className="font-semibold">{data.company.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Industry</dt>
              <dd className="font-semibold">{data.company.industry}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Plan</dt>
              <dd className="font-semibold capitalize">{data.company.plan}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Plants</dt>
              <dd className="text-right font-semibold">{data.company.plants.join(", ")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Signed-in user">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Name</dt>
              <dd className="font-semibold">{data.user.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Email</dt>
              <dd className="font-semibold">{data.user.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-2">
              <dt className="muted">Role</dt>
              <dd className="font-semibold">{roleLabels[data.user.role]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Department</dt>
              <dd className="font-semibold">{data.user.department}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Subscription plans" className="mt-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 ${
                data.company.plan === plan.id
                  ? "border-[var(--steel)] bg-[rgba(19,78,94,0.08)]"
                  : "border-[var(--line)] bg-white/70"
              }`}
            >
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="display mt-1 text-2xl font-bold text-[var(--steel)]">{plan.price}</p>
              <p className="muted mt-2 text-xs leading-relaxed">{plan.blurb}</p>
              {data.company.plan === plan.id ? (
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--ok)]">
                  Current plan
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Role permissions" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Role</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row) => (
                <tr key={row.role}>
                  <td className="font-semibold">{row.role}</td>
                  <td>{row.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
