"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { money, num } from "@/lib/format";
import { availableQty } from "@/lib/seed";

export default function ReportsPage() {
  const { data } = useForge();
  const lowStock = data.products.filter((p) => p.reorderPoint > 0 && availableQty(p) <= p.reorderPoint);
  const scrapRate =
    data.qualityChecks.reduce((s, q) => s + q.rejected, 0) /
    Math.max(
      1,
      data.qualityChecks.reduce((s, q) => s + q.inspected, 0)
    );

  return (
    <div className="fade-up">
      <TopBar
        title="Reports & Analytics"
        subtitle="Sales, inventory, production, finance, and HR views for operators and owners."
      />
      <PageHeaderNote>Phase 2 module · Charts and operational KPIs powered by live demo data.</PageHeaderNote>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Production planned vs actual">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.productionTrend}>
                <CartesianGrid stroke="rgba(12,25,34,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#3d5160", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#3d5160", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#c5ced8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" fill="#1b3a3a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Monthly P&L snapshot">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross profit</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueTrend.map((row) => (
                  <tr key={row.month}>
                    <td className="font-semibold">{row.month}</td>
                    <td>{money(row.revenue)}</td>
                    <td>{money(row.cogs)}</td>
                    <td className="font-semibold text-[var(--ok)]">{money(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <SectionCard title="Sales">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="muted">Orders MTD</span>
              <span className="font-semibold">{data.metrics.salesOrders}</span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Revenue MTD</span>
              <span className="font-semibold">{money(data.metrics.revenue)}</span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Top customer LTV</span>
              <span className="font-semibold">
                {money(Math.max(...data.customers.map((c) => c.lifetimeValue)))}
              </span>
            </li>
          </ul>
        </SectionCard>
        <SectionCard title="Inventory">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="muted">Low stock SKUs</span>
              <span className="font-semibold text-[var(--bad)]">{num(lowStock.length)}</span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Finished SKUs</span>
              <span className="font-semibold">
                {num(data.products.filter((p) => p.category === "finished_goods").length)}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Warehouses</span>
              <span className="font-semibold">{data.warehouses.length}</span>
            </li>
          </ul>
        </SectionCard>
        <SectionCard title="Production / QC">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="muted">Open PRs</span>
              <span className="font-semibold">
                {num(data.productionOrders.filter((p) => p.status !== "completed").length)}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Rejection rate</span>
              <span className="font-semibold">{(scrapRate * 100).toFixed(1)}%</span>
            </li>
            <li className="flex justify-between">
              <span className="muted">Avg machine efficiency</span>
              <span className="font-semibold">
                {Math.round(
                  data.machines
                    .filter((m) => m.efficiency > 0)
                    .reduce((s, m) => s + m.efficiency, 0) /
                    data.machines.filter((m) => m.efficiency > 0).length
                )}
                %
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
