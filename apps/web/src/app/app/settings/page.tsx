export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-ink-500">
          Runtime configuration for this ShopData environment.
        </p>
      </header>

      <section className="rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Environment</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-500">
          <li>
            Copy <code>.env.example</code> → <code>.env</code> and fill Shopify
            app credentials for live stores.
          </li>
          <li>
            Leave <code>S3_ENDPOINT</code> empty to store uploads/exports on
            local disk (<code>STORAGE_ROOT</code>).
          </li>
          <li>
            Set <code>SHOPDATA_DRY_RUN=true</code> (or use the seeded demo store)
            to exercise jobs without writing to Shopify.
          </li>
          <li>
            Access tokens are encrypted at rest and never sent to the browser.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">MVP checklist</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-500">
          <li>Connect store (OAuth or demo seed)</li>
          <li>Import products (CSV / XLSX)</li>
          <li>Export products (CSV / XLSX)</li>
          <li>Bulk update prices, inventory, status, or tags</li>
          <li>Monitor jobs, download errors, retry failed rows</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white/80 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Phase 2 (started)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-500">
          <li>Save / load import field mappings from the Import wizard</li>
          <li>Manage mappings and column templates under Templates</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white/80 p-5 text-sm text-ink-500 shadow-soft">
        Billing, teams/RBAC, scheduling, and multi-resource datasets are still
        planned — see <code>docs/ARCHITECTURE.md</code>.
      </section>
    </div>
  );
}
