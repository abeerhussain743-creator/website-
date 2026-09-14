import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent-soft/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-ink-700/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl font-bold tracking-tight text-ink-900">
          ShopData
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium text-ink-700">
          <Link href="/app" className="hover:text-accent">
            Open app
          </Link>
          <Link
            href="/api/auth/shopify/install?shop=example.myshopify.com"
            className="rounded-lg bg-ink-900 px-4 py-2 text-sand-50 transition hover:bg-ink-800"
          >
            Install on Shopify
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5.5rem)] w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Shopify data management
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-ink-950 sm:text-6xl">
            ShopData
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
            Make Shopify data operations as easy as uploading a spreadsheet —
            map, validate, preview, and run large imports without touching the
            API.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-soft"
            >
              Launch dashboard
            </Link>
            <Link
              href="/app/imports"
              className="rounded-lg border border-ink-300/70 bg-white/70 px-5 py-3 text-sm font-semibold text-ink-800 backdrop-blur transition hover:border-accent"
            >
              Start an import
            </Link>
          </div>
        </div>

        <div className="relative animate-fade-up-delay">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(15,118,110,0.25),transparent_45%),linear-gradient(145deg,#1a2540,#0c1222)] opacity-90" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 text-sand-50 shadow-soft">
            <div className="border-b border-white/10 px-5 py-4 text-sm text-ink-300">
              Live job · Product import
            </div>
            <div className="space-y-5 p-6">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Processing</span>
                  <span>67%</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-ink-700">
                  <div className="h-full w-2/3 animate-pulse bg-accent-soft" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-2xl font-semibold">8,012</div>
                  <div className="text-ink-300">Successful</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-2xl font-semibold">218</div>
                  <div className="text-ink-300">Failed</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-2xl font-semibold">12.3k</div>
                  <div className="text-ink-300">Total</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-300">
                Row-level errors, suggested fixes, and one-click retry for
                failed records — without reprocessing what already succeeded.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
