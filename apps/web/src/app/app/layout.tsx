import Link from "next/link";

const nav = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/stores", label: "Stores" },
  { href: "/app/imports", label: "Import" },
  { href: "/app/exports", label: "Export" },
  { href: "/app/bulk-update", label: "Bulk update" },
  { href: "/app/jobs", label: "Jobs" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-ink-100/80 bg-ink-950 text-sand-50 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-ink-800">
        <div className="px-5 py-6">
          <Link href="/" className="font-display text-xl font-bold">
            ShopData
          </Link>
          <p className="mt-1 text-xs text-ink-300">Data operations console</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="px-4 py-6 sm:px-8">{children}</div>
    </div>
  );
}
