"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check } from "lucide-react";
import type { PlanId } from "@/lib/types";

const plans: { id: PlanId; name: string; price: string; blurb: string }[] = [
  { id: "starter", name: "Starter", price: "$99–149/mo", blurb: "Single plant essentials" },
  { id: "growth", name: "Growth", price: "$299–499/mo", blurb: "Multi-department ops" },
  {
    id: "professional",
    name: "Professional",
    price: "$799–1,499/mo",
    blurb: "QC + warehouse + costing",
  },
  { id: "enterprise", name: "Enterprise", price: "Custom", blurb: "Multi-plant + API + SSO" },
];

const industries = [
  "Metal fabrication & components",
  "Garment / textile",
  "Furniture",
  "Packaging",
  "Plastics",
  "Food manufacturing",
  "Auto parts",
  "Other manufacturing",
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: industries[0],
    plantName: "Main Plant",
    country: "United States",
    employeeBand: "20-50",
    plan: "growth" as PlanId,
    ownerName: "",
    ownerEmail: "",
    password: "",
    withSampleData: true,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Signup failed");
        return;
      }
      router.replace(json.redirectTo || "/onboarding");
      router.refresh();
    } catch {
      setError("Could not create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="display text-2xl font-extrabold text-[var(--steel-deep)]">
            Forge
          </Link>
          <Link href="/login" className="text-sm font-semibold text-[var(--steel)]">
            Already have an account?
          </Link>
        </div>

        <section className="panel overflow-hidden p-0">
          <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-6 py-5 sm:px-8">
            <p className="easy-chip">SaaS onboarding</p>
            <h1 className="display mt-3 text-3xl font-bold">Create your manufacturing workspace</h1>
            <p className="muted mt-2 text-sm">
              Step {step} of 3 · Isolated tenant · Plan · Owner account
            </p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-2 flex-1 rounded-full ${
                    n <= step ? "bg-[var(--champagne)]" : "bg-[rgba(20,24,31,0.08)]"
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 px-6 py-7 sm:px-8">
            {step === 1 ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Company name</span>
                  <input
                    required
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    placeholder="Northwind Components"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Industry</span>
                  <select
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  >
                    {industries.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold">Primary plant</span>
                    <input
                      required
                      className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                      value={form.plantName}
                      onChange={(e) => update("plantName", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold">Country</span>
                    <input
                      className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Company size</span>
                  <select
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.employeeBand}
                    onChange={(e) => update("employeeBand", e.target.value)}
                  >
                    {["1-20", "20-50", "50-200", "200-1000", "1000+"].map((b) => (
                      <option key={b} value={b}>
                        {b} employees
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => update("plan", plan.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.plan === plan.id
                        ? "border-[var(--champagne)] bg-[rgba(184,146,90,0.12)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{plan.name}</p>
                      {form.plan === plan.id ? <Check size={16} className="text-[var(--ok)]" /> : null}
                    </div>
                    <p className="display mt-1 text-xl font-bold text-[var(--steel)]">{plan.price}</p>
                    <p className="muted mt-1 text-xs">{plan.blurb}</p>
                  </button>
                ))}
                <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.withSampleData}
                    onChange={(e) => update("withSampleData", e.target.checked)}
                  />
                  Load sample manufacturing data so Decision Center works on day one
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Building2 size={16} />
                    {form.companyName || "Your company"} · {form.plan}
                  </div>
                  <p className="muted mt-1 text-xs">
                    {form.industry} · {form.plantName}
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Your name</span>
                  <input
                    required
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Work email</span>
                  <input
                    required
                    type="email"
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.ownerEmail}
                    onChange={(e) => update("ownerEmail", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold">Password</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--champagne)]"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                </label>
              </>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-[rgba(192,57,43,0.1)] px-3 py-2 text-sm text-[var(--bad)]">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {step > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </button>
              ) : null}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {step < 3 ? "Continue" : loading ? "Creating workspace…" : "Create workspace"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
