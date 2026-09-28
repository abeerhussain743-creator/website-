import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroMotion } from "@/components/marketing/hero-motion";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-hero-mesh text-foam-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl tracking-tight">PostPilot</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user ? (
            <Link href="/app">
              <Button size="sm">Open app</Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-8">
        <HeroMotion />
        <p className="animate-fade-up font-display text-5xl leading-[1.05] tracking-tight text-balance md:text-7xl">
          PostPilot
        </p>
        <h1 className="mt-5 max-w-2xl animate-fade-up text-xl text-ink-200 delay-100 md:text-2xl [animation-delay:120ms]">
          Your AI social media team: strategist, copywriter, designer, and
          scheduler in one.
        </h1>
        <p className="mt-4 max-w-xl animate-fade-up text-sm text-ink-300 [animation-delay:220ms] md:text-base">
          Research competitors, diagnose your growth stage, generate a week of
          branded posts, approve on mobile, and publish at the best times.
        </p>
        <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:320ms]">
          <Link href={session?.user ? "/app" : "/sign-in"}>
            <Button size="lg">
              {session?.user ? "Go to dashboard" : "Start free"}
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="secondary">
              View demo login
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
