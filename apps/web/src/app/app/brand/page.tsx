import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegenerateDnaButton } from "@/components/brand/regenerate-dna";

export default async function BrandPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const brand = await prisma.brandProfile.findUnique({
    where: { workspaceId: workspace.id },
  });
  const kit = await prisma.brandKit.findFirst({
    where: { workspaceId: workspace.id, isPrimary: true },
    include: { logo: true },
  });
  const dna = await prisma.brandDNA.findFirst({
    where: { workspaceId: workspace.id, isActive: true },
    orderBy: { version: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Brand</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Profile, kit, and DNA for this workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegenerateDnaButton workspaceId={workspace.id} />
          <Link href="/app/onboarding">
            <Button variant="secondary">Edit via onboarding</Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-medium">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Item label="Name" value={brand?.businessName ?? workspace.name} />
            <Item label="Website" value={brand?.websiteUrl ?? "—"} />
            <Item label="Industry" value={brand?.industry ?? "—"} />
            <Item label="Niche" value={brand?.niche ?? "—"} />
            <Item label="USP" value={brand?.usp ?? "—"} />
          </dl>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-medium">Brand kit</h2>
          {kit ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  kit.primaryColor,
                  kit.secondaryColor,
                  kit.accentColor,
                  kit.backgroundColor,
                  kit.textColor,
                ]
                  .filter(Boolean)
                  .map((color) => (
                    <span
                      key={color}
                      title={color!}
                      className="h-10 w-10 rounded-xl border border-black/10"
                      style={{ background: color! }}
                    />
                  ))}
              </div>
              <p className="text-sm text-[var(--muted)]">
                {kit.fontHeading} / {kit.fontBody}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">No kit yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-medium">Brand DNA {dna ? `v${dna.version}` : ""}</h2>
        {dna ? (
          <pre className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {dna.rawDocument ?? "Versioned DNA document is present."}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Generate Brand DNA to lock voice rules, pillars, and visual guidance.
          </p>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
