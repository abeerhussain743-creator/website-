import { Button, EmptyState } from "@maxtrone/ui";
import { requireTenantContext } from "@/lib/tenant";
import { createTransportRoute, pingTransport } from "@/actions/phase23";

export default async function TransportPage() {
  const { db } = await requireTenantContext();
  const routes = await db.transportRoute.findMany({
    include: {
      pings: { orderBy: { recordedAt: "desc" }, take: 1 },
      alerts: { orderBy: { sentAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Transport</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Driver pings and “van is 5 minutes away” alerts
        </p>
      </div>

      <form action={createTransportRoute} className="grid gap-2 md:grid-cols-3">
        <input name="name" required placeholder="Route name" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="driverPhone" placeholder="+92300..." className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <input name="vehicleLabel" placeholder="Van LE-123" className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <Button type="submit">Add route</Button>
      </form>

      {routes.length === 0 ? (
        <EmptyState title="No routes" description="Add a van route, then ping a location to notify parents." />
      ) : (
        <ul className="space-y-4">
          {routes.map((r) => (
            <li key={r.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {r.vehicleLabel ?? "Vehicle"} · {r.driverPhone ?? "no driver phone"}
              </p>
              <form action={pingTransport} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="routeId" value={r.id} />
                <input name="lat" defaultValue="31.522" className="w-28 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                <input name="lng" defaultValue="74.36" className="w-28 rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                <Button type="submit" variant="outline">Ping location</Button>
              </form>
              {r.alerts.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {r.alerts.map((a) => (
                    <li key={a.id} className="text-[var(--muted-foreground)]">{a.message}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
