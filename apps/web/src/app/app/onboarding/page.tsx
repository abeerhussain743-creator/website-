import { requireSession } from "@/lib/access";
import { getPrimaryWorkspaceForUser } from "@/lib/tenancy";
import { prisma } from "@postpilot/db";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const session = await requireSession();
  const workspace = await getPrimaryWorkspaceForUser(session.user.id);
  const brand = await prisma.brandProfile.findUnique({
    where: { workspaceId: workspace.id },
  });
  const kit = await prisma.brandKit.findFirst({
    where: { workspaceId: workspace.id, isPrimary: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl tracking-tight">Brand onboarding</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Tell PostPilot about the business once. Progress saves on every step.
      </p>
      <div className="mt-8">
        <OnboardingWizard
          workspaceId={workspace.id}
          initialStep={workspace.onboardingStep}
          initialData={{
            business: {
              businessName: brand?.businessName ?? workspace.name,
              websiteUrl: brand?.websiteUrl ?? "",
              industry: brand?.industry ?? "",
              niche: brand?.niche ?? "",
              location: brand?.location ?? "",
              market: brand?.market ?? "",
              productsServices: brand?.productsServices ?? "",
              pricePositioning: brand?.pricePositioning ?? "",
              usp: brand?.usp ?? "",
            },
            audience: {
              audience: (brand?.audienceJson as {
                demographics?: string;
                pains?: string;
                desires?: string;
              }) ?? { demographics: "", pains: "", desires: "" },
              goals: brand?.goals ?? [],
            },
            tone: {
              toneSliders: (brand?.toneSliders as {
                formalCasual: number;
                seriousPlayful: number;
                boldSubtle: number;
              }) ?? { formalCasual: 50, seriousPlayful: 50, boldSubtle: 50 },
              wordsToUse: brand?.wordsToUse ?? [],
              wordsToAvoid: brand?.wordsToAvoid ?? [],
              contentLanguages: workspace.contentLanguages ?? ["en"],
            },
            brandKit: {
              primaryColor: kit?.primaryColor ?? "#0F3D3E",
              secondaryColor: kit?.secondaryColor ?? "#E8D5B7",
              accentColor: kit?.accentColor ?? "#D97706",
              backgroundColor: kit?.backgroundColor ?? "#FAF7F2",
              textColor: kit?.textColor ?? "#14212B",
              fontHeading: kit?.fontHeading ?? "Fraunces",
              fontBody: kit?.fontBody ?? "Sora",
              logoMediaId: kit?.logoMediaId ?? undefined,
            },
          }}
        />
      </div>
    </div>
  );
}
