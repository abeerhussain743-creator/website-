import { ExportForm } from "@/components/export-form";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const stores = await prisma.store
    .findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Export products</h1>
        <p className="mt-1 text-ink-500">
          Pull large product catalogs asynchronously, then download the file.
        </p>
      </header>
      <ExportForm
        stores={stores.map((s) => ({
          id: s.id,
          label: s.name ?? s.shopDomain,
        }))}
      />
    </div>
  );
}
