import Link from "next/link";
import { Button } from "@maxtrone/ui";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,162,74,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(14,27,44,0.08),transparent_35%),linear-gradient(165deg,#F6F3EC,#E8EEF4_55%,#F6F3EC)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(201,162,74,0.14),transparent_40%),linear-gradient(165deg,#0A1420,#122033)]"
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="font-display text-5xl font-semibold tracking-tight text-[var(--ink)] dark:text-[var(--ivory)] md:text-7xl">
          Maxtrone
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-2xl font-medium leading-snug text-[var(--body)] md:text-3xl">
          Fill seats. Collect fees. Earn new income — on WhatsApp.
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--muted-foreground)]">
          Multi-tenant campus SaaS for schools, coaching academies, and training
          centers in Pakistan. Urdu-first for parents. Money-first for owners.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="accent">
            <Link href="/login">Open dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
