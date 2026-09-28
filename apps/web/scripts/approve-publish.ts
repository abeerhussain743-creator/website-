
import { prisma } from "@postpilot/db";
import { approvePlannedPost, scheduleApprovedPosts, publishPlannedPost, pullMetrics, buildWeeklyReport } from "@postpilot/jobs";

async function main() {
  const plan = await prisma.contentPlan.findFirst({ orderBy: { createdAt: "desc" }, include: { posts: true } });
  if (!plan) throw new Error("no plan");
  for (const p of plan.posts) {
    await approvePlannedPost({ plannedPostId: p.id, channel: "DASHBOARD" });
  }
  const sched = await scheduleApprovedPosts(plan.workspaceId, plan.id);
  console.log("scheduled", sched);
  const first = plan.posts[0]!;
  const published = await publishPlannedPost(first.id);
  console.log("published", published.platformPostId);
  await pullMetrics(published.id, "H1");
  await pullMetrics(published.id, "H24");
  const report = await buildWeeklyReport(plan.workspaceId);
  console.log("report", report.id);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
