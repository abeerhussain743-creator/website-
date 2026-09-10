"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Rocket } from "lucide-react";
import type { PlanId, Role } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    plantName: "",
    plan: "growth" as PlanId,
    country: "",
    employeeBand: "",
    inviteEmail: "",
    inviteName: "",
    inviteRole: "admin" as Role,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) {
          router.replace("/signup");
          return;
        }
        const json = await res.json();
        setForm((prev) => ({
          ...prev,
          companyName: json.company.name ?? "",
          industry: json.company.industry ?? "",
          plantName: json.company.plants?.[0] ?? "Main Plant",
          plan: json.company.plan ?? "growth",
          country: json.company.country ?? "",
          employeeBand: json.company.employeeBand ?? "",
        }));
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not finish onboarding");
        return;
      }
      router.replace(json.redirectTo || "/app");
      router.refresh();
    } catch {
      setError("Network error while completing onboarding");
    } finally {
      setLoading(false);
    }
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="panel p-8 text-center">
          <p className="display text-2xl font-semibold">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <section className="panel overflow-hidden p-0">
          <div className="bg-[linear-gradient(145deg,#102828,#1b3a3a_60%,#2a5250)] px-7 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(212,180,131,0.9)]">
              Customer onboarding
            </p>
            <h1 className="display mt-3 text-3xl font-bold">Finish setup for your plant</h1>
            <p className="mt-2 max-w-lg text-sm text-white/75">
              Confirm company details, optionally invite an admin, then enter the Decision OS.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 px-7 py-7">
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold">Company name</span>
              <input
                required
                className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold">Industry</span>
                <input
                  required
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  value={form.industry}
                  onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold">Primary plant</span>
                <input
                  required
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  value={form.plantName}
                  onChange={(e) => setForm((p) => ({ ...p, plantName: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold">Plan</span>
                <select
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  value={form.plan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, plan: e.target.value as PlanId }))
                  }
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold">Company size</span>
                <input
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  value={form.employeeBand}
                  onChange={(e) => setForm((p) => ({ ...p, employeeBand: e.target.value }))}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-[rgba(184,146,90,0.35)] bg-[rgba(184,146,90,0.08)] p-4">
              <p className="text-sm font-semibold">Invite a teammate (optional)</p>
              <p className="muted mt-1 text-xs">
                They can sign in later with temporary password <strong>changeme123</strong>.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  placeholder="Name"
                  value={form.inviteName}
                  onChange={(e) => setForm((p) => ({ ...p, inviteName: e.target.value }))}
                />
                <input
                  type="email"
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                  placeholder="Email"
                  value={form.inviteEmail}
                  onChange={(e) => setForm((p) => ({ ...p, inviteEmail: e.target.value }))}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-xl bg-[rgba(192,57,43,0.1)] px-3 py-2 text-sm text-[var(--bad)]">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn btn-signal w-full" disabled={loading}>
              <Rocket size={16} />
              {loading ? "Launching workspace…" : "Launch Forge for my company"}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
