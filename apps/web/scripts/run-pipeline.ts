import { prisma } from "@postpilot/db";
import { runWeeklyPipeline, PIPELINE_STEPS } from "@postpilot/jobs";

async function main() {
  const ws = await prisma.workspace.findFirst({ where: { slug: "lumen-cafe" } });
  if (!ws) throw new Error("no workspace");
  const run = await prisma.pipelineRun.create({
    data: {
      workspaceId: ws.id,
      status: "QUEUED",
      stepsJson: PIPELINE_STEPS.map((step) => ({ step, status: "queued" })),
    },
  });
  console.log("run", run.id);
  await runWeeklyPipeline({
    workspaceId: ws.id,
    pipelineRunId: run.id,
    step: "FULL",
    promo: "Weekend tasting flight",
  });
  const fresh = await prisma.pipelineRun.findUnique({ where: { id: run.id } });
  const plan = await prisma.contentPlan.findFirst({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: { posts: true },
  });
  console.log(JSON.stringify({
    status: fresh?.status,
    error: fresh?.errorMessage,
    posts: plan?.posts.length,
    planStatus: plan?.status,
  }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
