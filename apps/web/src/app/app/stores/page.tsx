import Link from "next/link";
import { prisma } from "@shopdata/db";
import { ConnectStoreForm } from "@/components/connect-store-form";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const stores = await prisma.store
    .findMany({
      orderBy: { createdAt: "desc" },
      include: { connection: true },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Stores</h1>
        <p className="mt-1 text-ink-500">
          Connect Shopify stores via OAuth. Access tokens never leave the
          server.
        </p>
      </header>

      <ConnectStoreForm />

      <section className="space-y-3">
        {stores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white/70 px-5 py-12 text-center">
            <p className="font-medium">No stores connected</p>
            <p className="mt-1 text-sm text-ink-500">
              Enter your myshopify domain to start OAuth installation.
            </p>
          </div>
        ) : (
          stores.map((store) => (
            <div
              key={store.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white/80 px-5 py-4"
            >
              <div>
                <div className="font-semibold text-ink-900">
                  {store.name ?? store.shopDomain}
                </div>
                <div className="text-sm text-ink-500">{store.shopDomain}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={
                    store.connection && store.isActive
                      ? "rounded-md bg-accent-muted px-2 py-1 font-semibold text-accent"
                      : "rounded-md bg-red-100 px-2 py-1 font-semibold text-red-800"
                  }
                >
                  {store.connection && store.isActive
                    ? "Connected"
                    : "Disconnected"}
                </span>
                <Link href="/app/imports" className="font-medium text-accent">
                  Import →
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
