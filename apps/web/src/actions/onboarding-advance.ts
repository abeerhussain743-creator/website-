"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@maxtrone/db";
import { requireSession } from "@/lib/tenant";

export async function advanceOnboarding(formData: FormData) {
  const session = await requireSession();
  const next = String(formData.get("next") || "complete");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
  });
  if (!membership) throw new Error("No institution");

  const data: { onboardingStep: string; status?: "ACTIVE" } = {
    onboardingStep: next,
  };
  if (next === "complete") {
    data.status = "ACTIVE";
  }
  await prisma.institution.update({
    where: { id: membership.institutionId },
    data,
  });
  revalidatePath("/dashboard");
  if (next === "complete") redirect("/dashboard");
  redirect(`/onboarding?step=${next}`);
}
