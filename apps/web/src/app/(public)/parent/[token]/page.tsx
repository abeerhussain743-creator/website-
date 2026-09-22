import { isMagicLinkValid, formatPkr } from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { notFound } from "next/navigation";

export default async function ParentPortalPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.parentMagicLink.findUnique({
    where: { token },
  });
  if (!link || !isMagicLinkValid({ expiresAt: link.expiresAt, usedAt: link.usedAt })) {
    notFound();
  }

  const guardian = await prisma.guardian.findFirst({
    where: { id: link.guardianId, institutionId: link.institutionId },
    include: {
      students: {
        include: {
          student: {
            include: {
              invoices: {
                where: { deletedAt: null },
                orderBy: { dueDate: "desc" },
                take: 5,
              },
              marks: {
                include: { test: true },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
        },
      },
    },
  });
  if (!guardian) notFound();

  const institution = await prisma.institution.findUnique({
    where: { id: link.institutionId },
  });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <p className="text-sm text-[var(--muted-foreground)]">{institution?.name}</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">
        Assalam o alaikum, {guardian.fullName}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Fees, results and children — read-only parent view
      </p>

      <div className="mt-8 space-y-6">
        {guardian.students.map((linkRow) => {
          const s = linkRow.student;
          const outstanding = s.invoices.reduce(
            (sum, inv) => sum + (inv.totalPaisa - inv.paidPaisa),
            0,
          );
          return (
            <section
              key={s.id}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <h2 className="font-display text-xl">{s.fullName}</h2>
              <p className="mt-1 text-sm">
                Outstanding:{" "}
                <span className="tabular-nums font-medium">{formatPkr(outstanding)}</span>
              </p>
              {s.marks.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {s.marks.map((m) => (
                    <li key={m.id}>
                      {m.test.title}: {m.score}/{m.test.totalMarks}
                      {m.rank != null ? ` · rank ${m.rank}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
