import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { randomBytes } from "crypto";
import {
  applyMapping,
  validateImportRow,
  craftAdmissionsReply,
  buildMorningBriefing,
  nextRecoveryStep,
  textOnlyLadder,
  renderTemplate,
  formatPkr,
  buildInvoiceTotals,
  invoiceNumber,
  ADMISSIONS_PROMPT_VERSION,
  type ImportField,
} from "@maxtrone/core";
import { prisma, createTenantClient } from "@maxtrone/db";
import { createProviders } from "@maxtrone/providers";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const queues = {
  messaging: new Queue("messaging", { connection }),
  imports: new Queue("imports", { connection }),
  schedules: new Queue("schedules", { connection }),
  recovery: new Queue("recovery", { connection }),
  briefing: new Queue("briefing", { connection }),
  invoices: new Queue("invoices", { connection }),
};

const providers = createProviders();

async function recordFailure(
  queue: string,
  jobName: string,
  err: unknown,
  payload: unknown,
  institutionId?: string,
) {
  await prisma.jobFailure.create({
    data: {
      institutionId: institutionId ?? null,
      queue,
      jobName,
      payload: payload as object,
      error: err instanceof Error ? err.message : String(err),
      attempts: 1,
      status: "PENDING",
    },
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

const messagingWorker = new Worker(
  "messaging",
  async (job) => {
    if (job.name === "send-text" || job.name === "absent-alert" || job.name === "payment-receipt") {
      let to = job.data.to as string | undefined;
      let body = job.data.body as string | undefined;

      if (job.name === "absent-alert") {
        const db = createTenantClient(prisma, job.data.institutionId);
        const student = await db.student.findFirst({
          where: { id: job.data.studentId },
          include: { guardians: { include: { guardian: true } } },
        });
        const guardian = student?.guardians.find((g) => g.isPrimary)?.guardian
          ?? student?.guardians[0]?.guardian;
        if (!guardian?.whatsappOptIn) return { skipped: true };
        to = guardian.phone;
        body = `Assalam o alaikum ${guardian.fullName}. ${student?.fullName} was marked absent today (${job.data.date}).`;
      }

      if (job.name === "payment-receipt") {
        const payment = await prisma.payment.findUnique({
          where: { id: job.data.paymentId },
          include: { student: { include: { guardians: { include: { guardian: true } } } } },
        });
        const guardian = payment?.student?.guardians[0]?.guardian;
        if (!guardian) return { skipped: true };
        to = guardian.phone;
        body = `Payment received: ${formatPkr(payment!.amountPaisa)}. Shukriya!`;
      }

      if (!to || !body) return { skipped: true };

      const result = await providers.messaging.sendText({
        to,
        body,
        idempotencyKey: job.data.idempotencyKey,
      });

      if (job.data.messageId) {
        await prisma.message.updateMany({
          where: { id: job.data.messageId },
          data: {
            status: "SENT",
            providerMessageId: result.providerMessageId,
          },
        });
      }
      return result;
    }

    if (job.name === "broadcast-send") {
      const db = createTenantClient(prisma, job.data.institutionId);
      const broadcast = await db.broadcast.findFirst({
        where: { id: job.data.broadcastId },
      });
      if (!broadcast) return { skipped: true };
      const recipients = await db.broadcastRecipient.findMany({
        where: { broadcastId: broadcast.id, status: "QUEUED" },
      });
      for (const r of recipients) {
        await providers.messaging.sendText({
          to: r.phone,
          body: broadcast.body,
          idempotencyKey: `bcast:${broadcast.id}:${r.id}`,
        });
        await db.broadcastRecipient.update({
          where: { id: r.id },
          data: { status: "SENT" },
        });
      }
      await db.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      return { sent: recipients.length };
    }

    if (job.name === "inbound-ai") {
      const db = createTenantClient(prisma, job.data.institutionId);
      const conversation = await db.conversation.findFirst({
        where: { id: job.data.conversationId },
      });
      if (!conversation || conversation.aiPaused) return { skipped: true };

      const knowledge = await db.knowledgeBaseEntry.findMany();
      const reply = craftAdmissionsReply({
        message: job.data.body,
        knowledge,
      });

      await db.aIInteraction.create({
        data: {
          conversationId: conversation.id,
          promptVersion: ADMISSIONS_PROMPT_VERSION,
          input: job.data.body,
          output: reply.text,
          sources: reply.sources,
          latencyMs: 8,
        } as never,
      });

      if (reply.handoff) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { status: "HUMAN", aiPaused: true },
        });
        await db.task.create({
          data: {
            title: "Inbox handoff",
            description: job.data.body,
          } as never,
        });
      }

      const outKey = `ai-out:${conversation.id}:${job.id}`;
      await db.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          body: reply.text,
          status: "QUEUED",
          isAi: true,
          idempotencyKey: outKey,
        } as never,
      });

      await providers.messaging.sendText({
        to: conversation.phone,
        body: reply.text,
        idempotencyKey: outKey,
      });

      return reply;
    }

    if (job.name === "whatsapp-webhook") {
      log.info({ payload: job.data.payload }, "whatsapp webhook stored");
      return { ok: true };
    }

    return { ok: true };
  },
  { connection },
);

messagingWorker.on("failed", async (job, err) => {
  if (job) {
    await recordFailure("messaging", job.name, err, job.data, job.data.institutionId);
  }
});

const importsWorker = new Worker(
  "imports",
  async (job) => {
    const started = Date.now();
    const db = createTenantClient(prisma, job.data.institutionId);
    const importJob = await db.importJob.findFirst({
      where: { id: job.data.importJobId },
    });
    if (!importJob) return { skipped: true };

    const report = importJob.errorReport as {
      csv?: string;
      headers?: string[];
      mapping?: Record<string, ImportField>;
    } | null;

    const csv = report?.csv ?? "";
    const headers = report?.headers ?? [];
    const mapping = report?.mapping ?? {};
    const lines = csv.split(/\r?\n/).filter(Boolean).slice(1);

    const academic = await db.academicSession.findFirst({ where: { isCurrent: true } });
    if (!academic) throw new Error("No academic session");

    let success = 0;
    let errors = 0;
    const errorRows: Array<{ row: number; errors: string[] }> = [];

    for (let i = 0; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]!);
      const mapped = applyMapping(headers, values, mapping, i + 2);
      const validated = validateImportRow(mapped);
      if (!validated.ok) {
        errors += 1;
        errorRows.push({ row: validated.rowNumber, errors: validated.errors });
        continue;
      }

      const row = validated.row;
      let group = await db.group.findFirst({ where: { name: row.groupName! } });
      if (!group) {
        group = await db.group.create({
          data: { name: row.groupName!, sortOrder: 0 } as never,
        });
      }
      let subgroup = null;
      if (row.subgroupName) {
        subgroup = await db.subgroup.findFirst({
          where: { groupId: group.id, name: row.subgroupName },
        });
        if (!subgroup) {
          subgroup = await db.subgroup.create({
            data: {
              groupId: group.id,
              name: row.subgroupName,
            } as never,
          });
        }
      }

      let student = row.registrationNo
        ? await db.student.findFirst({
            where: { registrationNo: row.registrationNo },
          })
        : null;

      if (!student) {
        student = await db.student.create({
          data: {
            fullName: row.fullName!,
            registrationNo: row.registrationNo ?? null,
            status: "ACTIVE",
            admittedOn: new Date(),
          } as never,
        });
      }

      let guardian = await db.guardian.findFirst({
        where: { phone: row.guardianPhone! },
      });
      if (!guardian) {
        guardian = await db.guardian.create({
          data: {
            fullName: row.guardianName || "Guardian",
            phone: row.guardianPhone!,
            relation: row.relation || "Parent",
            preferredLanguage: "ROMAN_UR",
            whatsappOptIn: true,
            whatsappOptInAt: new Date(),
          } as never,
        });
      }

      const link = await db.studentGuardian.findFirst({
        where: { studentId: student.id, guardianId: guardian.id },
      });
      if (!link) {
        await db.studentGuardian.create({
          data: {
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          } as never,
        });
      }

      const enrollment = await db.enrollment.findFirst({
        where: { studentId: student.id, academicSessionId: academic.id },
      });
      if (!enrollment) {
        await db.enrollment.create({
          data: {
            studentId: student.id,
            groupId: group.id,
            subgroupId: subgroup?.id ?? null,
            academicSessionId: academic.id,
          } as never,
        });
      }

      success += 1;
    }

    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "COMPLETED",
        successRows: success,
        errorRows: errors,
        errorReport: { errors: errorRows, durationMs: Date.now() - started },
      },
    });

    log.info(
      { success, errors, ms: Date.now() - started, rows: lines.length },
      "import completed",
    );
    return { success, errors, durationMs: Date.now() - started };
  },
  { connection },
);

importsWorker.on("failed", async (job, err) => {
  if (job) {
    await recordFailure("imports", job.name, err, job.data, job.data.institutionId);
    await prisma.importJob.updateMany({
      where: { id: job.data.importJobId },
      data: { status: "FAILED" },
    });
  }
});

const invoicesWorker = new Worker(
  "invoices",
  async (job) => {
    const db = createTenantClient(prisma, job.data.institutionId);
    const students = await db.student.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: { enrollments: true, feeAssignments: { include: { feeStructure: true } } },
    });

    const structures = await db.feeStructure.findMany({
      where: { deletedAt: null, frequency: "MONTHLY" },
    });

    const count = await db.invoice.count();
    let created = 0;
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    for (const student of students) {
      const groupId = student.enrollments[0]?.groupId;
      const lines = structures
        .filter((s) => !s.groupId || s.groupId === groupId)
        .map((s) => ({
          description: s.name,
          amountPaisa:
            student.feeAssignments.find((a) => a.feeStructureId === s.id)
              ?.amountOverridePaisa ?? s.amountPaisa,
        }));
      if (lines.length === 0) continue;

      const siblingLinks = await db.studentGuardian.findMany({
        where: {
          studentId: student.id,
        },
      });
      // sibling count approx: guardians shared with other active students
      let siblingCount = 0;
      for (const link of siblingLinks) {
        const others = await db.studentGuardian.count({
          where: {
            guardianId: link.guardianId,
            NOT: { studentId: student.id },
          },
        });
        siblingCount = Math.max(siblingCount, others);
      }

      const totals = buildInvoiceTotals({ lines, siblingCount });
      const number = invoiceNumber("INV", count + created + 1);
      const token = randomBytes(12).toString("hex");

      const invoice = await db.invoice.create({
        data: {
          studentId: student.id,
          number,
          status: "ISSUED",
          issueDate,
          dueDate,
          subtotalPaisa: totals.subtotalPaisa,
          discountPaisa: totals.discountPaisa,
          lateFeePaisa: totals.lateFeePaisa,
          totalPaisa: totals.totalPaisa,
          paymentLinkToken: token,
        } as never,
      });

      for (const line of lines) {
        await db.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            description: line.description,
            amountPaisa: line.amountPaisa,
          } as never,
        });
      }
      created += 1;
    }

    return { created };
  },
  { connection },
);

const recoveryWorker = new Worker(
  "recovery",
  async (job) => {
    if (job.name !== "run-ladder") return { skipped: true };
    const institutionId = job.data.institutionId as string;
    const db = createTenantClient(prisma, institutionId);
    const ladder = await db.recoveryLadder.findFirst({
      where: { isActive: true },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    if (!ladder) return { skipped: true };

    const steps = textOnlyLadder(
      ladder.steps.map((s) => ({
        dayOffset: s.dayOffset,
        channel: s.channel as "WHATSAPP_TEXT" | "TASK",
        templateBody: s.templateBody,
      })),
    );

    const invoices = await db.invoice.findMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        deletedAt: null,
      },
      include: {
        student: { include: { guardians: { include: { guardian: true } } } },
        recoveryRuns: true,
      },
    });

    const today = new Date();
    let sent = 0;
    for (const inv of invoices) {
      const completed = inv.recoveryRuns.map((r) => r.stepDayOffset);
      const next = nextRecoveryStep({
        dueDate: new Date(inv.dueDate),
        today,
        paid: inv.paidPaisa >= inv.totalPaisa,
        promiseToPayOn: inv.promiseToPayOn,
        completedOffsets: completed,
        steps,
      });
      if (!next) continue;

      if (next.channel === "TASK") {
        await db.task.create({
          data: {
            title: `Call parent — invoice ${inv.number}`,
            description: next.templateBody,
          } as never,
        });
      } else {
        const guardian = inv.student.guardians[0]?.guardian;
        if (guardian?.whatsappOptIn) {
          const body = renderTemplate(next.templateBody, {
            guardian_name: guardian.fullName,
            student_name: inv.student.fullName,
            amount_due: formatPkr(inv.totalPaisa - inv.paidPaisa),
            due_date: new Date(inv.dueDate).toISOString().slice(0, 10),
            payment_link: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/${inv.paymentLinkToken}`,
            invoice_number: inv.number,
          });
          await providers.messaging.sendText({
            to: guardian.phone,
            body,
            idempotencyKey: `recovery:${inv.id}:${next.dayOffset}`,
          });
        }
      }

      await db.recoveryRun.create({
        data: {
          ladderId: ladder.id,
          invoiceId: inv.id,
          stepDayOffset: next.dayOffset,
          status: "SENT",
        } as never,
      });
      sent += 1;
    }
    return { sent };
  },
  { connection },
);

const briefingWorker = new Worker(
  "briefing",
  async (job) => {
    if (job.name !== "morning-briefing") return { skipped: true };
    const institutionId = job.data.institutionId as string;
    const db = createTenantClient(prisma, institutionId);
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) return { skipped: true };

    const ownerMembership = await prisma.membership.findFirst({
      where: {
        institutionId,
        isActive: true,
        role: { systemRole: "OWNER" },
      },
      include: { user: true, role: true },
    });
    if (!ownerMembership) return { skipped: true };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayStart = new Date(yesterday);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const payments = await db.payment.findMany({
      where: {
        status: "SUCCEEDED",
        receivedAt: { gte: dayStart, lte: dayEnd },
      },
    });
    const feesCollectedYesterdayPaisa = payments.reduce((s, p) => s + p.amountPaisa, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const absentToday = await db.attendanceRecord.count({
      where: {
        status: "ABSENT",
        session: { date: today },
      },
    });

    const newInquiries = await db.lead.count({
      where: { createdAt: { gte: dayStart } },
    });
    const visitsBooked = await db.booking.count({
      where: { createdAt: { gte: dayStart }, status: "BOOKED" },
    });

    const body = buildMorningBriefing({
      ownerName: ownerMembership.user.name,
      institutionName: institution.name,
      feesCollectedYesterdayPaisa,
      feesCollectedWeekAvgPaisa: feesCollectedYesterdayPaisa,
      absentStudents: absentToday,
      absentTeachers: 0,
      newInquiries,
      visitsBooked,
      attentionItems: [],
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`,
    });

    const started = Date.now();
    const briefing = await db.briefing.create({
      data: {
        recipientUserId: ownerMembership.userId,
        body,
        sentAt: new Date(),
      } as never,
    });

    if (ownerMembership.user.phone || true) {
      // Prefer WhatsApp to owner phone if present; else log-only sandbox
      const to = ownerMembership.user.phone ?? "+923001111111";
      await providers.messaging.sendText({
        to,
        body,
        idempotencyKey: `briefing:${briefing.id}`,
      });
    }

    const ms = Date.now() - started;
    log.info({ institutionId, ms }, "briefing generated");
    return { briefingId: briefing.id, latencyMs: ms };
  },
  { connection },
);

const schedulesWorker = new Worker(
  "schedules",
  async (job) => {
    if (job.name === "heartbeat") {
      log.info({ at: new Date().toISOString() }, "worker heartbeat");
      return { ok: true };
    }
    if (job.name === "daily-recovery") {
      const institutions = await prisma.institution.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      for (const inst of institutions) {
        await queues.recovery.add(
          "run-ladder",
          { institutionId: inst.id },
          { jobId: `recovery:${inst.id}:${new Date().toISOString().slice(0, 10)}` },
        );
      }
      return { tenants: institutions.length };
    }
    if (job.name === "daily-briefing") {
      const institutions = await prisma.institution.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      for (const inst of institutions) {
        await queues.briefing.add(
          "morning-briefing",
          { institutionId: inst.id },
          { jobId: `briefing:${inst.id}:${new Date().toISOString().slice(0, 10)}` },
        );
      }
      return { tenants: institutions.length };
    }
  },
  { connection },
);

async function main() {
  await queues.schedules.add(
    "heartbeat",
    {},
    { repeat: { every: 60_000 }, jobId: "worker-heartbeat", removeOnComplete: 10 },
  );
  await queues.schedules.add(
    "daily-recovery",
    {},
    {
      repeat: { pattern: "0 9 * * *", tz: "Asia/Karachi" },
      jobId: "daily-recovery",
    },
  );
  await queues.schedules.add(
    "daily-briefing",
    {},
    {
      repeat: { pattern: "0 8 * * 1-5", tz: "Asia/Karachi" },
      jobId: "daily-briefing",
    },
  );
  log.info("Maxtrone Phase 1 worker started");
}

main().catch((err) => {
  log.error(err, "worker failed to start");
  process.exit(1);
});

process.on("SIGINT", async () => {
  await Promise.all([
    messagingWorker.close(),
    importsWorker.close(),
    invoicesWorker.close(),
    recoveryWorker.close(),
    briefingWorker.close(),
    schedulesWorker.close(),
    connection.quit(),
  ]);
  process.exit(0);
});
