"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { DEMO_PASSWORD, demoUsers } from "@/lib/auth-shared";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";

  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accounts = useMemo(
    () =>
      demoUsers.map((u) => ({
        email: u.email,
        role: u.role,
        name: u.name,
      })),
    []
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the Forge API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel overflow-hidden p-0">
        <div className="bg-[linear-gradient(145deg,#102828,#1b3a3a_55%,#2a5250)] px-8 py-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(212,180,131,0.9)]">
            Forge access
          </p>
          <h1 className="display mt-3 text-4xl font-extrabold">Sign in to your plant OS</h1>
          <p className="mt-3 max-w-md text-sm text-white/75">
            Demo auth with role-based session cookies. Phase 1 actions persist on the server for Apex
            Metalworks.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-8 py-8">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold">Email</span>
            <input
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none ring-[var(--champagne)] focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold">Password</span>
            <input
              type="password"
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none ring-[var(--champagne)] focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-[rgba(192,57,43,0.1)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Enter Forge"}
            <ArrowRight size={16} />
          </button>
          <p className="text-center text-sm text-[var(--ink-soft)]">
            <Link href="/" className="font-semibold text-[var(--steel)]">
              Back to marketing site
            </Link>
          </p>
        </form>
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[var(--champagne)]">
          <ShieldCheck size={18} />
          <p className="text-sm font-bold uppercase tracking-[0.12em]">Demo accounts</p>
        </div>
        <p className="muted mt-2 text-sm">
          Password for all accounts: <strong>{DEMO_PASSWORD}</strong>
        </p>
        <div className="mt-5 space-y-3">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-left transition hover:border-[var(--champagne)]"
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
              }}
            >
              <p className="font-semibold">{account.name}</p>
              <p className="muted text-xs">
                {account.email} · {account.role.replaceAll("_", " ")}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <Suspense fallback={<div className="panel mx-auto max-w-lg p-8">Loading sign-in…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
