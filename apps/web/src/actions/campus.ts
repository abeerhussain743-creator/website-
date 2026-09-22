"use server";

import { revalidatePath } from "next/cache";
import { normalizePakistanPhone } from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { requireTenantContext } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { getQueues } from "@/lib/queues";

export async function createStudent(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const fullName = String(formData.get("fullName") || "").trim();
  const registrationNo = String(formData.get("registrationNo") || "").trim() || null;
  const groupId = String(formData.get("groupId") || "");
  const subgroupId = String(formData.get("subgroupId") || "") || null;
  const guardianName = String(formData.get("guardianName") || "").trim();
  const guardianPhoneRaw = String(formData.get("guardianPhone") || "").trim();
  const phone = normalizePakistanPhone(guardianPhoneRaw);
  if (!fullName || !phone || !groupId) throw new Error("Missing required fields");

  const sessionRow = await db.academicSession.findFirst({
    where: { isCurrent: true },
  });
  if (!sessionRow) throw new Error("No academic session");

  const branch = await db.branch.findFirst({
    where: { isPrimary: true },
  });

  const student = await db.student.create({
    data: {
      fullName,
      registrationNo,
      status: "ACTIVE",
      admittedOn: new Date(),
      branchId: branch?.id ?? null,
    } as never,
  });

  // Re-fetch with proper create via prisma for relations
  const studentId = student.id;

  let guardian = await db.guardian.findFirst({ where: { phone } });
  if (!guardian) {
    guardian = await db.guardian.create({
      data: {
        fullName: guardianName || "Guardian",
        phone,
        relation: String(formData.get("relation") || "Parent"),
        preferredLanguage: "ROMAN_UR",
        preferredChannel: "WHATSAPP_TEXT",
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
      } as never,
    });
  }

  await db.studentGuardian.create({
    data: {
      studentId,
      guardianId: guardian.id,
      isPrimary: true,
    } as never,
  });

  await db.enrollment.create({
    data: {
      studentId,
      groupId,
      subgroupId,
      academicSessionId: sessionRow.id,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Student",
    entityId: studentId,
  });

  revalidatePath("/students");
}

export async function createLead(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const parentName = String(formData.get("parentName") || "").trim();
  const phoneRaw = String(formData.get("phone") || "").trim();
  const phone = normalizePakistanPhone(phoneRaw);
  const childName = String(formData.get("childName") || "").trim() || null;
  const classSought = String(formData.get("classSought") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!parentName || !phone) throw new Error("Parent name and phone required");

  const existingGuardian = await db.guardian.findFirst({ where: { phone } });
  const stage = await db.leadStage.findFirst({
    where: { slug: "new" },
    orderBy: { sortOrder: "asc" },
  });
  if (!stage) throw new Error("Lead stages not configured");

  const source = await db.leadSource.findFirst({
    where: { code: "walkin" },
  });

  const existing = await db.lead.findFirst({
    where: { phone, status: "OPEN", deletedAt: null },
  });
  if (existing) {
    revalidatePath("/admissions");
    return;
  }

  const lead = await db.lead.create({
    data: {
      parentName,
      phone,
      childName,
      classSought,
      notes,
      stageId: stage.id,
      sourceId: source?.id,
      isSiblingLead: Boolean(existingGuardian),
      status: "OPEN",
    } as never,
  });

  await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "created",
      body: "Lead created (walk-in)",
      actorId: session.user.id,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Lead",
    entityId: lead.id,
  });

  revalidatePath("/admissions");
}

export async function moveLeadStage(leadId: string, stageId: string) {
  const { db, institution, session } = await requireTenantContext();
  const stage = await db.leadStage.findFirst({ where: { id: stageId } });
  if (!stage) throw new Error("Stage not found");

  const lead = await db.lead.update({
    where: { id: leadId },
    data: {
      stageId,
      status: stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN",
    },
  });

  await db.leadActivity.create({
    data: {
      leadId,
      type: "stage_change",
      body: `Moved to ${stage.name}`,
      actorId: session.user.id,
    } as never,
  });

  if (stage.isWon) {
    await convertLeadToStudent(leadId);
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "update",
    entityType: "Lead",
    entityId: lead.id,
    diff: { stageId },
  });

  revalidatePath("/admissions");
}

export async function convertLeadToStudent(leadId: string) {
  const { db, institution, session } = await requireTenantContext();
  const lead = await db.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  if (lead.convertedStudentId) return lead.convertedStudentId;

  const academic = await db.academicSession.findFirst({ where: { isCurrent: true } });
  const group = lead.classSought
    ? await db.group.findFirst({ where: { name: lead.classSought } })
    : await db.group.findFirst({ orderBy: { sortOrder: "asc" } });

  const student = await db.student.create({
    data: {
      fullName: lead.childName || lead.parentName,
      status: "ACTIVE",
      admittedOn: new Date(),
    } as never,
  });

  let guardian = await db.guardian.findFirst({ where: { phone: lead.phone } });
  if (!guardian) {
    guardian = await db.guardian.create({
      data: {
        fullName: lead.parentName,
        phone: lead.phone,
        relation: "Parent",
        preferredLanguage: "ROMAN_UR",
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
      } as never,
    });
  }

  await db.studentGuardian.create({
    data: { studentId: student.id, guardianId: guardian.id, isPrimary: true } as never,
  });

  if (group && academic) {
    await db.enrollment.create({
      data: {
        studentId: student.id,
        groupId: group.id,
        academicSessionId: academic.id,
      } as never,
    });
  }

  await db.lead.update({
    where: { id: leadId },
    data: { convertedStudentId: student.id, status: "WON" },
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "convert",
    entityType: "Lead",
    entityId: leadId,
    metadata: { studentId: student.id },
  });

  revalidatePath("/students");
  revalidatePath("/admissions");
  return student.id;
}

export async function submitAttendance(input: {
  groupId: string;
  subgroupId?: string | null;
  date: string;
  absences: string[];
}) {
  const { db, institution, session } = await requireTenantContext();
  const date = new Date(input.date);

  const enrollments = await db.enrollment.findMany({
    where: {
      groupId: input.groupId,
      ...(input.subgroupId ? { subgroupId: input.subgroupId } : {}),
      deletedAt: null,
    },
  });

  const sessionRow = await db.attendanceSession.create({
    data: {
      groupId: input.groupId,
      subgroupId: input.subgroupId || null,
      date,
      markedById: session.user.id,
    } as never,
  });

  const absentSet = new Set(input.absences);
  for (const e of enrollments) {
    await db.attendanceRecord.create({
      data: {
        sessionId: sessionRow.id,
        studentId: e.studentId,
        status: absentSet.has(e.studentId) ? "ABSENT" : "PRESENT",
      } as never,
    });
  }

  const queues = getQueues();
  for (const studentId of input.absences) {
    await queues.messaging.add(
      "absent-alert",
      {
        institutionId: institution.id,
        studentId,
        date: input.date,
        idempotencyKey: `absent:${institution.id}:${studentId}:${input.date}`,
      },
      {
        jobId: `absent:${institution.id}:${studentId}:${input.date}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
      },
    );
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "AttendanceSession",
    entityId: sessionRow.id,
  });

  revalidatePath("/attendance");
  return { sessionId: sessionRow.id, marked: enrollments.length };
}

export async function recordCashPayment(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const invoiceId = String(formData.get("invoiceId") || "");
  const amountPkr = Number(formData.get("amountPkr") || 0);
  const amountPaisa = Math.round(amountPkr * 100);
  if (!invoiceId || amountPaisa <= 0) throw new Error("Invalid payment");

  const invoice = await db.invoice.findFirst({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");

  const idempotencyKey = `cash:${invoiceId}:${amountPaisa}:${Date.now()}`;
  const { applyPaymentToInvoice } = await import("@maxtrone/core");
  const result = applyPaymentToInvoice({
    totalPaisa: invoice.totalPaisa,
    paidPaisa: invoice.paidPaisa,
    paymentPaisa: amountPaisa,
  });

  const payment = await db.payment.create({
    data: {
      studentId: invoice.studentId,
      channel: "CASH",
      status: "SUCCEEDED",
      amountPaisa: result.appliedPaisa,
      idempotencyKey,
      receivedAt: new Date(),
      note: String(formData.get("note") || "Cash entry"),
    } as never,
  });

  await db.paymentAllocation.create({
    data: {
      paymentId: payment.id,
      invoiceId,
      amountPaisa: result.appliedPaisa,
    } as never,
  });

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      paidPaisa: result.paidPaisa,
      status: result.status,
    },
  });

  const queues = getQueues();
  await queues.messaging.add(
    "payment-receipt",
    {
      institutionId: institution.id,
      paymentId: payment.id,
      invoiceId,
      idempotencyKey: `receipt:${payment.id}`,
    },
    { jobId: `receipt:${payment.id}`, attempts: 3 },
  );

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Payment",
    entityId: payment.id,
  });

  revalidatePath("/fees");
}
