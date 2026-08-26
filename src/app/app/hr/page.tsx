"use client";

import { TopBar } from "@/components/layout/TopBar";
import { MetricCard, PageHeaderNote, SectionCard, StatusBadge } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import { moneyExact, num } from "@/lib/format";

export default function HrPage() {
  const { data } = useForge();
  const active = data.employees.filter((e) => e.status === "active");
  const onLeave = data.employees.filter((e) => e.status === "leave");

  const shifts = [
    { name: "Morning", hours: "6 AM → 2 PM", key: "morning" as const },
    { name: "Evening", hours: "2 PM → 10 PM", key: "evening" as const },
    { name: "Night", hours: "10 PM → 6 AM", key: "night" as const },
  ];

  return (
    <div className="fade-up">
      <TopBar
        title="HR & Payroll"
        subtitle="People, shifts, attendance, and labor cost tied to production orders."
      />
      <PageHeaderNote>
        Phase 3 module · Connect workers to Production → Work Orders → Hours → Payroll for true
        labor cost per order.
      </PageHeaderNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Employees" value={num(data.employees.length)} />
        <MetricCard label="Active today" value={num(active.length)} tone="ok" />
        <MetricCard label="On leave" value={num(onLeave.length)} tone="warn" />
        <MetricCard
          label="Shopfloor headcount"
          value={num(
            active.filter((e) =>
              ["Fabrication", "Machining", "Assembly", "QC", "Warehouse", "Maintenance"].includes(
                e.department
              )
            ).length
          )}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {shifts.map((shift) => (
          <div key={shift.key} className="panel-flat p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {shift.name} shift
            </p>
            <p className="display mt-2 text-xl font-bold">{shift.hours}</p>
            <p className="muted mt-2 text-sm">
              {data.employees.filter((e) => e.shift === shift.key && e.status === "active").length}{" "}
              active workers
            </p>
          </div>
        ))}
      </div>

      <SectionCard title="Workforce" className="mt-5">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.name}</td>
                  <td>{e.department}</td>
                  <td>{e.role}</td>
                  <td className="capitalize">{e.shift}</td>
                  <td>{e.hourlyRate ? `${moneyExact(e.hourlyRate)}/hr` : "Salary"}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
