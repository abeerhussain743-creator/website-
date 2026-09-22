import Link from "next/link";
import { requireTenantContext } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@maxtrone/ui";
import { hasFeature, resolveEntitlements } from "@maxtrone/core";
import { prisma } from "@maxtrone/db";

export default async function SettingsPage() {
  const { institution, session } = await requireTenantContext();
  const entitlements = resolveEntitlements(
    institution.plan.entitlements,
    institution.entitlementOverrides,
  );

  const [templates, knowledge, wa, audit, invites] = await Promise.all([
    prisma.messageTemplate.findMany({
      where: { institutionId: institution.id },
      take: 20,
    }),
    prisma.knowledgeBaseEntry.findMany({
      where: { institutionId: institution.id },
      take: 20,
    }),
    prisma.whatsAppConnection.findUnique({
      where: { institutionId: institution.id },
    }),
    prisma.auditLog.findMany({
      where: { institutionId: institution.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.institutionInvite.findMany({
      where: { institutionId: institution.id },
      take: 10,
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Institution, terminology, WhatsApp, templates, audit
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Institution</CardTitle>
            <CardDescription>Profile and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Name: {institution.name}</p>
            <p>Type: {institution.type}</p>
            <p>Timezone: {institution.timezone}</p>
            <p>Quiet hours: {institution.quietHoursStart}:00–{institution.quietHoursEnd}:00</p>
            <p>Plan: {institution.plan.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terminology</CardTitle>
            <CardDescription>Never hardcode these labels</CardDescription>
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
              <p>No terminology map.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>Sandbox or Meta Cloud API</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Mode: {wa?.mode ?? "not connected"}</p>
            <p>Number: {wa?.displayNumber ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entitlements</CardTitle>
            <CardDescription>Server-side feature checks</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {["admissions", "fees", "ai_admissions", "briefing", "whatsapp_inbox", "ai_tutor"].map(
                (f) => (
                  <li key={f} className="rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm">
                    {f}: {hasFeature(entitlements, f) ? "enabled" : "locked"}
                  </li>
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge base</CardTitle>
          <CardDescription>Grounds the AI admissions agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {knowledge.map((k) => (
            <div key={k.id} className="rounded-[12px] border border-[var(--border)] px-3 py-2">
              <p className="font-medium">{k.title}</p>
              <p className="text-[var(--muted-foreground)]">{k.body}</p>
            </div>
          ))}
          {knowledge.length === 0 ? <p>No entries yet.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message templates</CardTitle>
          <CardDescription>Meta approval tracked in-app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {templates.map((t) => (
            <div key={t.id} className="flex justify-between rounded-[12px] border border-[var(--border)] px-3 py-2">
              <span>{t.name} · {t.language}</span>
              <span className="text-[var(--muted-foreground)]">{t.status}</span>
            </div>
          ))}
          {templates.length === 0 ? <p>No templates yet.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Owner-visible change history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between gap-3 border-b border-[var(--border)] py-2 last:border-0">
              <span>
                {a.action} · {a.entityType}
              </span>
              <span className="tabular-nums text-[var(--muted-foreground)]">
                {a.createdAt.toISOString().slice(0, 19)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {user?.isSuperAdmin ? (
        <Button asChild variant="outline">
          <Link href="/super-admin">Open super-admin</Link>
        </Button>
      ) : null}

      <p className="text-xs text-[var(--muted-foreground)]">Staff invites: {invites.length}</p>
    </div>
  );
}
