"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { money, num } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  const { data } = useForge();
  const m = data.metrics;

  return (
    <div className="fade-up">
      <TopBar
        title="Today’s overview"
        subtitle="Live operating picture across sales, production, inventory, and cash."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Revenue" value={money(m.revenue)} hint="Month to date" tone="ok" />
        <MetricCard label="Sales orders" value={num(m.salesOrders)} />
        <MetricCard label="Production orders" value={num(m.productionOrders)} />
        <MetricCard label="Pending orders" value={num(m.pendingOrders)} tone="warn" />
        <MetricCard label="Low stock items" value={num(m.lowStockItems)} tone="bad" />
        <MetricCard label="Purchase orders" value={num(m.purchaseOrders)} />
        <MetricCard label="Outstanding receivables" value={money(m.receivables)} tone="warn" />
        <MetricCard label="Outstanding payables" value={money(m.payables)} />
        <MetricCard label="Cash balance" value={money(m.cashBalance)} tone="ok" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Revenue vs profit"
          action={
            <Link href="/app/reports" className="text-sm font-semibold text-[var(--steel)]">
              Reports →
            </Link>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#134e5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#134e5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(12,25,34,0.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#3d5160", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#3d5160", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v) => money(Number(v ?? 0))} />
                <Area type="monotone" dataKey="revenue" stroke="#134e5e" fill="url(#rev)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" stroke="#c2410c" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Alerts"
          action={
            <Link href="/app/ai" className="text-sm font-semibold text-[var(--steel)]">
              Ask AI →
            </Link>
          }
        >
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge status={alert.severity} />
                  <span className="text-[11px] text-[var(--ink-soft)]">{alert.time}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{alert.title}</p>
                <p className="muted mt-1 text-xs leading-relaxed">{alert.detail}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--steel)]">
                  {alert.module}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Active production">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.productionOrders
                  .filter((p) => p.status !== "completed")
                  .slice(0, 4)
                  .map((p) => {
                    const product = data.products.find((x) => x.id === p.productId);
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.number}</td>
                        <td>{product?.name}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress w-24">
                              <span style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs">{p.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Quick actions"
          action={<ArrowUpRight size={16} className="text-[var(--ink-soft)]" />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["/app/sales", "Convert quotation", "Turn QT-1023 into a sales order"],
              ["/app/production", "Resolve shortage", "Create purchase from BOM gap"],
              ["/app/inventory", "Review low stock", "Steel & packaging thresholds"],
              ["/app/ai", "Ask the copilot", "Why did profit drop this month?"],
            ].map(([href, title, body]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--steel)]"
              >
                <p className="font-semibold">{title}</p>
                <p className="muted mt-1 text-xs">{body}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
