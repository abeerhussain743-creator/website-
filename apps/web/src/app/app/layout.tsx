import Link from "next/link";
import { requireSession } from "@/lib/access";
import { ensurePersonalOrg, getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/studio", label: "Design Studio" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/review", label: "Review Board" },
  { href: "/app/competitors", label: "Competitors" },
  { href: "/app/stage", label: "Account Stage" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/reports", label: "Weekly Report" },
  { href: "/app/brand", label: "Brand" },
  { href: "/app/onboarding", label: "Onboarding" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/admin", label: "Admin" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  await ensurePersonalOrg(session.user.id, session.user.name ?? undefined);
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);


  return (
    <div className="min-h-screen bg-app-grain">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]/80 p-5 backdrop-blur md:block">
          <Link href="/" className="font-display text-2xl tracking-tight">
            PostPilot
          </Link>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            {workspace.name}
          </p>
          <nav className="mt-8 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-ink-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 md:px-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Workspace
              </p>
              <p className="font-medium">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="hidden text-sm text-[var(--muted)] sm:inline">
                {session.user.email}
              </span>
            </div>
          </header>
          <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
