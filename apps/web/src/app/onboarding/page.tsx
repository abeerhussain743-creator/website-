import { redirect } from "next/navigation";

/** Onboarding wizard lands in Phase 1 — seeded tenants go straight to the dashboard. */
export default function OnboardingPage() {
  redirect("/dashboard");
}
