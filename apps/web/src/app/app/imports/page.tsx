import { ImportWizard } from "@/components/import-wizard";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const stores = await prisma.store
    .findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Import products</h1>
        <p className="mt-1 text-ink-500">
          Upload CSV → auto-map columns → validate → preview → run in the
          background.
        </p>
      </header>
      <ImportWizard
        stores={stores.map((s) => ({
          id: s.id,
          label: s.name ?? s.shopDomain,
        }))}
      />
    </div>
  );
}
