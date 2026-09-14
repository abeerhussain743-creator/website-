import { BulkUpdateForm } from "@/components/bulk-update-form";
import { prisma } from "@shopdata/db";

export const dynamic = "force-dynamic";

export default async function BulkUpdatePage() {
  const stores = await prisma.store
    .findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Bulk update</h1>
        <p className="mt-1 text-ink-500">
          Apply structured operations across products without editing thousands
          of spreadsheet rows.
        </p>
      </header>
      <BulkUpdateForm
        stores={stores.map((s) => ({
          id: s.id,
          label: s.name ?? s.shopDomain,
        }))}
      />
    </div>
  );
}
