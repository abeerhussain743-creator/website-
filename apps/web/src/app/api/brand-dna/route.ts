import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import { generateBrandDna, type BrandContext } from "@postpilot/ai";

const bodySchema = z.object({
  workspaceId: z.string(),
  rawDocument: z.string().max(20000).optional(),
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
    const dna = generateBrandDna(ctx);
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
        provider: "OTHER",
        kind: "BRAND_DNA",
        model: "local-brand-dna",
        success: true,
      },
    });
    return NextResponse.json({ dna: saved });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
