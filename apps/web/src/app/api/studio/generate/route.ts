import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma } from "@postpilot/db";
import {
  generatePost,
  generatePostInputSchema,
} from "@postpilot/ai";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  platform: generatePostInputSchema.shape.platform,
  format: generatePostInputSchema.shape.format,
  topic: z.string().max(500).optional(),
  objective: generatePostInputSchema.shape.objective.optional(),
  templateFamily: generatePostInputSchema.shape.templateFamily.optional(),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    const [brand, kit] = await Promise.all([
      prisma.brandProfile.findUnique({ where: { workspaceId: body.workspaceId } }),
      prisma.brandKit.findFirst({
        where: { workspaceId: body.workspaceId, isPrimary: true },
      }),
    ]);

    if (!brand) {
      return NextResponse.json(
        { error: "Complete brand onboarding first" },
        { status: 400 },
      );
    }

    const post = await generatePost({
      brand: {
        businessName: brand.businessName,
        industry: brand.industry ?? undefined,
        niche: brand.niche ?? undefined,
        usp: brand.usp ?? undefined,
        toneSliders: (brand.toneSliders as {
          formalCasual: number;
          seriousPlayful: number;
          boldSubtle: number;
        }) ?? undefined,
        wordsToUse: brand.wordsToUse,
        wordsToAvoid: brand.wordsToAvoid,
        goals: brand.goals,
        audience: (brand.audienceJson as {
          demographics?: string;
          pains?: string;
          desires?: string;
        }) ?? undefined,
        brandKit: kit
          ? {
              primaryColor: kit.primaryColor ?? undefined,
              secondaryColor: kit.secondaryColor ?? undefined,
              accentColor: kit.accentColor ?? undefined,
              backgroundColor: kit.backgroundColor ?? undefined,
              textColor: kit.textColor ?? undefined,
              fontHeading: kit.fontHeading ?? undefined,
              fontBody: kit.fontBody ?? undefined,
            }
          : undefined,
      },
      platform: body.platform,
      format: body.format,
      topic: body.topic,
      objective: body.objective ?? "engagement",
      templateFamily: body.templateFamily,
      feedback: body.feedback,
    });

    await prisma.aICallLog.create({
      data: {
        workspaceId: body.workspaceId,
        provider: post.provider.includes("anthropic")
          ? "ANTHROPIC"
          : post.provider.includes("openai")
            ? "OPENAI"
            : "OTHER",
        kind: "COPY",
        model: post.provider,
        success: true,
        metaJson: {
          quality: post.qualityScores,
          format: body.format,
          platform: body.platform,
        },
      },
    });

    return NextResponse.json({ post });
  } catch (err) {
    if (err instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", issues: err.issues },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
