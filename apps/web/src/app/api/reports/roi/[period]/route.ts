import { buildRoiReportHtml } from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { requireTenantContext } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> },
) {
  const { period } = await params;
  const { institution } = await requireTenantContext();
  const report = await prisma.monthlyReport.findUnique({
    where: {
      institutionId_period: { institutionId: institution.id, period },
    },
  });
  if (!report) {
    return new Response("Report not found", { status: 404 });
  }

  const summary = report.summary as {
    headlineText?: string;
    inquiriesAnswered?: number;
    avgFirstResponseMinutes?: number;
    visitsBooked?: number;
    admissionsWon?: number;
    admissionsAnnualFeePaisa?: number;
    feesRecoveredByAutomationPaisa?: number;
    tutorIncomePaisa?: number;
    messagesSent?: number;
    readRatePct?: number;
    atRiskStudentsSaved?: number;
  };

  const html = buildRoiReportHtml({
    institutionName: institution.name,
    brandPrimary: institution.brandPrimary,
    period: report.period,
    headlinePaisa: report.headlinePaisa,
    headlineText: summary.headlineText ?? `Maxtrone impact for ${period}`,
    inquiriesAnswered: summary.inquiriesAnswered ?? 0,
    avgFirstResponseMinutes: summary.avgFirstResponseMinutes ?? 0,
    visitsBooked: summary.visitsBooked ?? 0,
    admissionsWon: summary.admissionsWon ?? 0,
    admissionsAnnualFeePaisa: summary.admissionsAnnualFeePaisa ?? 0,
    feesRecoveredByAutomationPaisa: summary.feesRecoveredByAutomationPaisa ?? 0,
    tutorIncomePaisa: summary.tutorIncomePaisa ?? 0,
    messagesSent: summary.messagesSent ?? 0,
    readRatePct: summary.readRatePct ?? 0,
    atRiskStudentsSaved: summary.atRiskStudentsSaved ?? 0,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="maxtrone-roi-${period}.html"`,
    },
  });
}
