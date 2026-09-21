import { requireTenantContext } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@maxtrone/ui";
import { hasFeature, resolveEntitlements } from "@maxtrone/core";

export default async function SettingsPage() {
  const { institution } = await requireTenantContext();
  const entitlements = resolveEntitlements(
    institution.plan.entitlements,
    institution.entitlementOverrides,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Institution profile, terminology, plan and usage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Institution</CardTitle>
            <CardDescription>Profile and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted-foreground)]">Name:</span>{" "}
              {institution.name}
            </p>
            <p>
              <span className="text-[var(--muted-foreground)]">Type:</span>{" "}
              {institution.type}
            </p>
            <p>
              <span className="text-[var(--muted-foreground)]">Timezone:</span>{" "}
              {institution.timezone}
            </p>
            <p>
              <span className="text-[var(--muted-foreground)]">Plan:</span>{" "}
              {institution.plan.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terminology</CardTitle>
            <CardDescription>Never hardcode these labels in UI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {institution.terminology ? (
              <>
                <p>Group: {institution.terminology.group}</p>
                <p>Subgroup: {institution.terminology.subgroup}</p>
                <p>Learner: {institution.terminology.learner}</p>
                <p>Term: {institution.terminology.term}</p>
                <p>Guardian: {institution.terminology.guardian}</p>
              </>
            ) : (
              <p>No terminology map yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feature entitlements</CardTitle>
            <CardDescription>Server-side checks via hasFeature / withinLimit</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "admissions",
                "fees",
                "ai_admissions",
                "ai_tutor",
                "voice_calls",
                "briefing",
              ].map((feature) => (
                <li
                  key={feature}
                  className="rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span className="font-medium">{feature}</span>
                  <span className="ml-2 text-[var(--muted-foreground)]">
                    {hasFeature(entitlements, feature) ? "enabled" : "locked"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
