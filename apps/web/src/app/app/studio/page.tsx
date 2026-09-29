import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import { DesignStudio } from "@/components/studio/design-studio";

export default async function StudioPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const brand = await prisma.brandProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted)]">Design Studio</p>
        <h1 className="font-display text-4xl tracking-tight">
          Make the best post
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Generate hooks, captions, and premium branded visuals from your brand
          kit — scored by a quality critic before you publish.
        </p>
      </div>

      {!brand ? (
        <div className="rounded-2xl border border-ember-500/30 bg-ember-500/10 p-5 text-sm">
          Finish onboarding so the studio can use your Brand DNA and kit.
        </div>
      ) : (
        <DesignStudio
          workspaceId={workspace.id}
          businessName={brand.businessName}
        />
      )}
    </div>
  );
}
