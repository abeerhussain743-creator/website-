import { buildReportCardHtml, buildMinimalPdf } from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { requireTenantContext } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const { institution } = await requireTenantContext();
  const url = new URL(req.url);
  const asPdf = url.searchParams.get("format") === "pdf";

  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: institution.id },
    include: {
      marks: {
        include: { test: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      reportCards: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!student) return new Response("Not found", { status: 404 });

  const termLabel =
    url.searchParams.get("term") ??
    student.reportCards[0]?.termLabel ??
    "Current term";

  const subjects = student.marks.map((m) => ({
    title: m.test.title,
    score: m.score,
    total: m.test.totalMarks,
    rank: m.rank,
    weakTopics: m.weakTopics,
  }));

  if (asPdf) {
    const pdf = buildMinimalPdf([
      institution.name,
      `Report card — ${student.fullName}`,
      termLabel,
      ...subjects.map(
        (s) =>
          `${s.title}: ${s.score}/${s.total}${s.rank != null ? ` rank ${s.rank}` : ""}`,
      ),
    ]);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report-card-${student.registrationNo ?? student.id}.pdf"`,
      },
    });
  }

  const html = buildReportCardHtml({
    institutionName: institution.name,
    studentName: student.fullName,
    registrationNo: student.registrationNo,
    termLabel,
    subjects,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
