export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-ink-500">
          App configuration, billing, and team controls land in later phases.
        </p>
      </header>
      <div className="rounded-2xl border border-ink-100 bg-white/80 p-5 text-sm text-ink-500 shadow-soft">
        <p>
          Environment variables are documented in <code>.env.example</code>.
          Shopify credentials and the token encryption key must never be exposed
          to the browser.
        </p>
      </div>
    </div>
  );
}
