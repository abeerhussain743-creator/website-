import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import {
  generateBrandDna,
  ingestWebsite,
  getLlmAdapter,
  type BrandContext,
} from "@postpilot/ai";

const bodySchema = z.object({
  workspaceId: z.string(),
  rawDocument: z.string().max(20000).optional(),
  scrapeWebsite: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");
    const brand = await prisma.brandProfile.findUnique({
      where: { workspaceId: body.workspaceId },
    });
    const kit = await prisma.brandKit.findFirst({
      where: { workspaceId: body.workspaceId, isPrimary: true },
    });
    if (!brand) {
      return NextResponse.json({ error: "Brand profile required" }, { status: 400 });
    }
    const ctx: BrandContext = {
      businessName: brand.businessName,
      industry: brand.industry ?? undefined,
      niche: brand.niche ?? undefined,
      usp: brand.usp ?? undefined,
      toneSliders: brand.toneSliders as BrandContext["toneSliders"],
      wordsToUse: brand.wordsToUse,
      wordsToAvoid: brand.wordsToAvoid,
      goals: brand.goals,
      audience: brand.audienceJson as BrandContext["audience"],
      brandKit: kit
        ? {
            primaryColor: kit.primaryColor ?? undefined,
            accentColor: kit.accentColor ?? undefined,
            secondaryColor: kit.secondaryColor ?? undefined,
            backgroundColor: kit.backgroundColor ?? undefined,
            textColor: kit.textColor ?? undefined,
            fontHeading: kit.fontHeading ?? undefined,
            fontBody: kit.fontBody ?? undefined,
          }
        : undefined,
    };

    const website =
      body.scrapeWebsite && brand.websiteUrl
        ? await ingestWebsite({
            url: brand.websiteUrl,
            businessName: brand.businessName,
          })
        : undefined;

    const adapter = await getLlmAdapter();
    const result = adapter.generateBrandDna
      ? await adapter.generateBrandDna({ brand: ctx, website })
      : {
          dna: generateBrandDna(ctx),
          cost: { provider: "local", model: "local-brand-dna", costUsd: 0 },
        };
    const dna = result.dna;
    if (body.rawDocument) dna.rawDocument = body.rawDocument;

    const latest = await prisma.brandDNA.findFirst({
      where: { workspaceId: body.workspaceId },
      orderBy: { version: "desc" },
    });
    await prisma.brandDNA.updateMany({
      where: { workspaceId: body.workspaceId, isActive: true },
      data: { isActive: false },
    });
    const saved = await prisma.brandDNA.create({
      data: {
        workspaceId: body.workspaceId,
        version: (latest?.version ?? 0) + 1,
        isActive: true,
        voiceRules: dna.voiceRules,
        contentPillars: dna.contentPillars,
        audiencePersona: dna.audiencePersona,
        doList: dna.doList,
        dontList: dna.dontList,
        visualStyleGuide: dna.visualStyleGuide,
        provenHooks: dna.provenHooks,
        rawDocument: dna.rawDocument,
      },
    });
    await prisma.aICallLog.create({
      data: {
        workspaceId: body.workspaceId,
        provider:
          result.cost.provider === "anthropic"
            ? "ANTHROPIC"
            : result.cost.provider === "openai"
              ? "OPENAI"
              : "OTHER",
        kind: "BRAND_DNA",
        model: result.cost.model,
        success: true,
        inputTokens: result.cost.inputTokens,
        outputTokens: result.cost.outputTokens,
        costUsdCents: result.cost.costUsd
          ? Math.round(result.cost.costUsd * 100)
          : 0,
        metaJson: website ? { websiteSource: website.source, url: website.url } : {},
      },
    });
    return NextResponse.json({ dna: saved, website });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
