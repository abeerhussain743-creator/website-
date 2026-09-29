import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { assertWorkspaceAccess, WorkspaceAccessError } from "@/lib/access";
import { prisma, OnboardingStep } from "@postpilot/db";
import {
  audienceStepSchema,
  brandKitStepSchema,
  businessStepSchema,
  onboardingDataSchema,
  toneStepSchema,
  uniqueSlug,
} from "@postpilot/shared";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  step: z.enum([
    "BUSINESS",
    "AUDIENCE",
    "TONE",
    "BRAND_KIT",
    "SOCIAL",
    "REVIEW",
    "COMPLETE",
  ]),
  nextStep: z.enum([
    "BUSINESS",
    "AUDIENCE",
    "TONE",
    "BRAND_KIT",
    "SOCIAL",
    "REVIEW",
    "COMPLETE",
  ]),
  complete: z.boolean().optional(),
  data: onboardingDataSchema,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = bodySchema.parse(json);
    await assertWorkspaceAccess(session.user.id, body.workspaceId, "EDITOR");

    const existing = await prisma.workspace.findUniqueOrThrow({
      where: { id: body.workspaceId },
    });
    const prevData = (existing.onboardingData ?? {}) as Record<string, unknown>;
    const mergedData = {
      ...prevData,
      ...body.data,
    };

    if (body.step === "BUSINESS" && body.data.business) {
      const business = businessStepSchema.parse(body.data.business);
      await prisma.brandProfile.upsert({
        where: { workspaceId: body.workspaceId },
        create: {
          workspaceId: body.workspaceId,
          ...business,
        },
        update: business,
      });
      await prisma.workspace.update({
        where: { id: body.workspaceId },
        data: {
          name: business.businessName,
          slug: uniqueSlug(business.businessName, body.workspaceId.slice(-4)),
        },
      });
    }

    if (body.step === "AUDIENCE" && body.data.audience) {
      const audience = audienceStepSchema.parse(body.data.audience);
      await prisma.brandProfile.upsert({
        where: { workspaceId: body.workspaceId },
        create: {
          workspaceId: body.workspaceId,
          businessName: existing.name,
          audienceJson: audience.audience,
          goals: audience.goals,
        },
        update: {
          audienceJson: audience.audience,
          goals: audience.goals,
        },
      });
    }

    if (body.step === "TONE" && body.data.tone) {
      const tone = toneStepSchema.parse(body.data.tone);
      await prisma.brandProfile.upsert({
        where: { workspaceId: body.workspaceId },
        create: {
          workspaceId: body.workspaceId,
          businessName: existing.name,
          toneSliders: tone.toneSliders,
          wordsToUse: tone.wordsToUse,
          wordsToAvoid: tone.wordsToAvoid,
        },
        update: {
          toneSliders: tone.toneSliders,
          wordsToUse: tone.wordsToUse,
          wordsToAvoid: tone.wordsToAvoid,
        },
      });
      await prisma.workspace.update({
        where: { id: body.workspaceId },
        data: { contentLanguages: tone.contentLanguages },
      });
    }

    if (body.step === "BRAND_KIT" && body.data.brandKit) {
      const kit = brandKitStepSchema.parse(body.data.brandKit);
      const primary = await prisma.brandKit.findFirst({
        where: { workspaceId: body.workspaceId, isPrimary: true },
      });
      if (primary) {
        await prisma.brandKit.update({
          where: { id: primary.id },
          data: kit,
        });
      } else {
        await prisma.brandKit.create({
          data: {
            workspaceId: body.workspaceId,
            isPrimary: true,
            name: "Primary",
            ...kit,
          },
        });
      }
    }

    const nextStep = body.complete
      ? OnboardingStep.COMPLETE
      : (body.nextStep as OnboardingStep);

    await prisma.workspace.update({
      where: { id: body.workspaceId },
      data: {
        onboardingStep: nextStep,
        onboardingData: mergedData,
      },
    });

    return NextResponse.json({ ok: true, onboardingStep: nextStep });
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
