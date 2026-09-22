"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import {
  voiceNoteTextHash,
  personalizeVoiceScript,
  canPlaceVoiceCall,
  normalizeCallOutcome,
  rankMarks,
  craftWeeklyProgressNote,
  computeRiskScore,
  buildMonthlyRoiReport,
  isAutomationRecovered,
  buildReferralCode,
  craftTutorReply,
  splitTutorRevenue,
  createParentMagicToken,
  magicLinkExpiresAt,
  buildOmrQrPayload,
  gradeOmrMock,
} from "@maxtrone/core";
import { prisma } from "@maxtrone/db";
import { createProviders } from "@maxtrone/providers";
import { requireTenantContext } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { getQueues } from "@/lib/queues";

const providers = createProviders();

export async function synthesizeVoiceNote(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const template = String(formData.get("text") || "").trim();
  const language = String(formData.get("language") || "ur-PK");
  const studentName = String(formData.get("studentName") || "student");
  const amountDue = String(formData.get("amountDue") || "");
  if (!template) throw new Error("Text required");

  const text = personalizeVoiceScript(template, {
    student_name: studentName,
    amount_due: amountDue,
  });
  const textHash = voiceNoteTextHash(text, language);

  const existing = await db.voiceNote.findFirst({
    where: { textHash, language },
  });
  if (existing) {
    revalidatePath("/voice");
    return;
  }

  const lang = language === "en-US" ? "en-US" : "ur-PK";
  const result = await providers.tts.synthesize({
    text,
    language: lang,
    idempotencyKey: `tts:${institution.id}:${textHash}`,
  });

  const note = await db.voiceNote.create({
    data: {
      textHash,
      text,
      language,
      audioUrl: result.audioUrl,
      characters: result.characters,
      durationMs: result.durationMs,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "VoiceNote",
    entityId: note.id,
  });

  revalidatePath("/voice");
}

export async function placeFeeVoiceCall(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const guardianId = String(formData.get("guardianId") || "");
  const phone = String(formData.get("phone") || "").trim();
  if (!phone) throw new Error("Phone required");

  const hour = new Date().getHours();
  const last = await db.voiceCall.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  const gate = canPlaceVoiceCall({ hour, lastCallAt: last?.createdAt ?? null });
  if (!gate.ok) throw new Error(gate.reason ?? "Cannot place call");

  const idempotencyKey = `vcall:${institution.id}:${phone}:${new Date().toISOString().slice(0, 10)}`;
  const existing = await db.voiceCall.findFirst({ where: { idempotencyKey } });
  if (existing) {
    revalidatePath("/voice");
    return;
  }

  const result = await providers.voice.startCall({
    to: phone,
    script: "Fee reminder call in Urdu",
    language: "ur-PK",
    idempotencyKey,
    metadata: { purpose: "FEE_REMINDER" },
  });

  const call = await db.voiceCall.create({
    data: {
      guardianId: guardianId || null,
      phone,
      purpose: "FEE_REMINDER",
      outcome: normalizeCallOutcome(result.outcome),
      promisedDate: result.promisedDate ? new Date(result.promisedDate) : null,
      transcript: result.transcript,
      recordingUrl: result.recordingUrl,
      providerCallId: result.callId,
      idempotencyKey,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "VoiceCall",
    entityId: call.id,
  });

  revalidatePath("/voice");
}

export async function createTest(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const title = String(formData.get("title") || "").trim();
  const totalMarks = Number(formData.get("totalMarks") || 0);
  const testDate = String(formData.get("testDate") || "");
  const subjectName = String(formData.get("subject") || "General").trim();
  const groupId = String(formData.get("groupId") || "") || null;
  if (!title || !totalMarks || !testDate) throw new Error("Missing fields");

  let subject = await db.subject.findFirst({ where: { name: subjectName } });
  if (!subject) {
    subject = await db.subject.create({
      data: { name: subjectName } as never,
    });
  }

  const test = await db.test.create({
    data: {
      subjectId: subject.id,
      groupId,
      title,
      totalMarks,
      testDate: new Date(testDate),
    } as never,
  });

  const qCount = Number(formData.get("questionCount") || 5);
  for (let i = 1; i <= qCount; i++) {
    await db.testQuestion.create({
      data: {
        testId: test.id,
        number: i,
        topic: String(formData.get(`topic_${i}`) || `Topic ${i}`),
        marks: 1,
        correctOption: String(formData.get(`correct_${i}`) || "A"),
      } as never,
    });
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Test",
    entityId: test.id,
  });

  revalidatePath("/tests");
}

export async function saveMarks(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const testId = String(formData.get("testId") || "");
  const raw = String(formData.get("marksJson") || "[]");
  const rows = JSON.parse(raw) as Array<{ studentId: string; score: number; weakTopics?: string[] }>;
  if (!testId || !rows.length) throw new Error("No marks");

  const ranked = rankMarks(rows);
  for (const m of ranked) {
    await prisma.mark.upsert({
      where: { testId_studentId: { testId, studentId: m.studentId } },
      update: {
        score: m.score,
        rank: m.rank,
        weakTopics: m.weakTopics ?? [],
      },
      create: {
        institutionId: institution.id,
        testId,
        studentId: m.studentId,
        score: m.score,
        rank: m.rank,
        weakTopics: m.weakTopics ?? [],
      },
    });
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "update",
    entityType: "Test",
    entityId: testId,
    metadata: { marks: ranked.length },
  });

  revalidatePath("/tests");
}

export async function publishTestResults(testId: string) {
  const { db, institution, session } = await requireTenantContext();
  const test = await db.test.findFirst({
    where: { id: testId },
    include: { marks: { include: { student: { include: { guardians: { include: { guardian: true } } } } } } },
  });
  if (!test) throw new Error("Test not found");

  await db.test.update({
    where: { id: testId },
    data: { publishedAt: new Date() },
  });

  const queues = getQueues();
  for (const mark of test.marks) {
    const guardian = mark.student.guardians.find((g) => g.isPrimary)?.guardian
      ?? mark.student.guardians[0]?.guardian;
    if (!guardian?.whatsappOptIn) continue;
    const { parentResultMessage } = await import("@maxtrone/core");
    const body = parentResultMessage({
      studentName: mark.student.fullName,
      testTitle: test.title,
      score: mark.score,
      totalMarks: test.totalMarks,
      rank: mark.rank,
      weakTopics: mark.weakTopics,
    });
    await queues.messaging.add(
      "send-text",
      {
        institutionId: institution.id,
        to: guardian.phone,
        body,
        idempotencyKey: `result:${testId}:${mark.studentId}`,
      },
      { jobId: `result:${testId}:${mark.studentId}`, attempts: 3 },
    );
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "publish",
    entityType: "Test",
    entityId: testId,
  });

  revalidatePath("/tests");
}

export async function generateOmrSheet(testId: string) {
  const { db, institution, session } = await requireTenantContext();
  const test = await db.test.findFirst({ where: { id: testId } });
  if (!test) throw new Error("Test not found");

  const sheetId = randomBytes(6).toString("hex");
  const qrPayload = buildOmrQrPayload(testId, sheetId);
  const sheet = await db.oMRSheet.create({
    data: {
      testId,
      qrPayload,
      pdfUrl: `mock://omr/${testId}/${sheetId}.pdf`,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "OMRSheet",
    entityId: sheet.id,
  });

  revalidatePath("/tests");
}

export async function uploadOmrScan(formData: FormData) {
  const { db, institution } = await requireTenantContext();
  const testId = String(formData.get("testId") || "");
  const imageUrl = String(formData.get("imageUrl") || `mock://upload/${Date.now()}.jpg`);
  if (!testId) throw new Error("testId required");

  const scan = await db.oMRScan.create({
    data: {
      testId,
      imageUrl,
      status: "PENDING",
    } as never,
  });

  await getQueues().academics.add(
    "omr-grade",
    { institutionId: institution.id, scanId: scan.id },
    { jobId: `omr:${scan.id}`, attempts: 3 },
  );

  revalidatePath("/tests");
}

export async function reviewOmrScan(scanId: string, accept: boolean) {
  const { db, institution, session } = await requireTenantContext();
  const scan = await db.oMRScan.findFirst({
    where: { id: scanId },
    include: { test: { include: { questions: true } } },
  });
  if (!scan) throw new Error("Scan not found");

  if (!accept) {
    await db.oMRScan.update({
      where: { id: scanId },
      data: { status: "REJECTED" },
    });
    revalidatePath("/tests");
    return;
  }

  const student = await db.student.findFirst({ where: { status: "ACTIVE" } });
  await db.oMRScan.update({
    where: { id: scanId },
    data: {
      status: "ACCEPTED",
      studentId: student?.id ?? null,
    },
  });

  if (student && scan.score != null) {
    await prisma.mark.upsert({
      where: { testId_studentId: { testId: scan.testId, studentId: student.id } },
      update: { score: scan.score },
      create: {
        institutionId: institution.id,
        testId: scan.testId,
        studentId: student.id,
        score: scan.score,
      },
    });
  }

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "review",
    entityType: "OMRScan",
    entityId: scanId,
  });

  revalidatePath("/tests");
}

export async function approveProgressNotes() {
  const { db, institution } = await requireTenantContext();
  const drafts = await db.progressNote.findMany({ where: { status: "DRAFT" } });
  for (const n of drafts) {
    await db.progressNote.update({
      where: { id: n.id },
      data: { status: "APPROVED" },
    });
  }
  await getQueues().academics.add(
    "send-progress-notes",
    { institutionId: institution.id },
    { jobId: `progress-send:${institution.id}:${Date.now()}` },
  );
  revalidatePath("/progress");
}

export async function runRiskScoringNow() {
  const { institution } = await requireTenantContext();
  await getQueues().intelligence.add(
    "risk-score",
    { institutionId: institution.id },
    { jobId: `risk:${institution.id}:${new Date().toISOString().slice(0, 10)}` },
  );
  revalidatePath("/risk");
}

export async function generateMonthlyRoiNow() {
  const { institution } = await requireTenantContext();
  const period = new Date().toISOString().slice(0, 7);
  await getQueues().intelligence.add(
    "monthly-roi",
    { institutionId: institution.id, period },
    { jobId: `roi:${institution.id}:${period}` },
  );
  revalidatePath("/roi");
}

export async function createReferralForGuardian(guardianId: string) {
  const { db, institution, session } = await requireTenantContext();
  const guardian = await db.guardian.findFirst({ where: { id: guardianId } });
  if (!guardian) throw new Error("Guardian not found");

  const code = buildReferralCode({
    institutionSlug: institution.slug,
    guardianId: guardian.id,
  });

  const existing = await db.referral.findFirst({ where: { code } });
  if (existing) {
    revalidatePath("/referrals");
    return;
  }

  const referral = await db.referral.create({
    data: {
      code,
      guardianId: guardian.id,
      rewardPaisa: 100_000,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Referral",
    entityId: referral.id,
  });

  revalidatePath("/referrals");
}

export async function enrollTutorStudent(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const studentId = String(formData.get("studentId") || "");
  const pricePkr = Number(formData.get("pricePkr") || 750);
  if (!studentId) throw new Error("Student required");

  const enrollment = await prisma.tutorEnrollment.upsert({
    where: {
      institutionId_studentId: { institutionId: institution.id, studentId },
    },
    update: { active: true, parentConsentAt: new Date() },
    create: {
      institutionId: institution.id,
      studentId,
      parentConsentAt: new Date(),
      dailyCap: 40,
      active: true,
    },
  });

  await db.tutorSubscription.create({
    data: {
      enrollmentId: enrollment.id,
      pricePaisa: Math.round(pricePkr * 100),
      status: "ACTIVE",
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "TutorEnrollment",
    entityId: enrollment.id,
  });

  revalidatePath("/tutor");
}

export async function askTutorDemo(formData: FormData) {
  const { db, institution } = await requireTenantContext();
  const enrollmentId = String(formData.get("enrollmentId") || "");
  const message = String(formData.get("message") || "").trim();
  if (!enrollmentId || !message) throw new Error("Missing fields");

  const enrollment = await db.tutorEnrollment.findFirst({
    where: { id: enrollmentId, active: true },
  });
  if (!enrollment?.parentConsentAt) throw new Error("Consent required");

  const chunks = await db.syllabusChunk.findMany({ take: 50 });
  const reply = craftTutorReply({
    message,
    chunks: chunks.map((c) => ({
      id: c.id,
      chapter: c.chapter,
      topic: c.topic,
      page: c.page,
      content: c.content,
    })),
  });

  if (reply.distress) {
    await db.safeguardingAlert.create({
      data: {
        studentId: enrollment.studentId,
        severity: "CRITICAL",
        triggerText: message.slice(0, 500),
        status: "OPEN",
        notifiedAt: new Date(),
      } as never,
    });
  }

  const tutorSession = await db.tutorSession.create({
    data: { enrollmentId } as never,
  });

  await db.tutorMessage.create({
    data: {
      sessionId: tutorSession.id,
      role: "user",
      content: message,
      moderated: true,
    } as never,
  });

  await db.tutorMessage.create({
    data: {
      sessionId: tutorSession.id,
      role: "assistant",
      content: reply.text,
      citedChunkIds: reply.citedChunkIds,
      moderated: reply.moderated,
    } as never,
  });

  if (reply.stopTutoring) {
    await db.tutorEnrollment.update({
      where: { id: enrollmentId },
      data: { active: false },
    });
  }

  revalidatePath("/tutor");
}

export async function uploadSyllabusChunk(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const title = String(formData.get("title") || "Syllabus").trim();
  const content = String(formData.get("content") || "").trim();
  const chapter = String(formData.get("chapter") || "") || null;
  const topic = String(formData.get("topic") || "") || null;
  if (!content) throw new Error("Content required");

  const doc = await db.syllabusDocument.create({
    data: {
      title,
      board: String(formData.get("board") || "Sindh Board") || null,
      grade: String(formData.get("grade") || "8") || null,
      subject: String(formData.get("subject") || "Science") || null,
      status: "READY",
    } as never,
  });

  await db.syllabusChunk.create({
    data: {
      documentId: doc.id,
      chapter,
      topic,
      page: Number(formData.get("page") || 1) || 1,
      content,
      embedding: [0.1, 0.2, 0.3],
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "SyllabusDocument",
    entityId: doc.id,
  });

  revalidatePath("/tutor");
}

export async function closeRevenueSharePeriod(period: string) {
  const { db, institution, session } = await requireTenantContext();
  const subs = await db.tutorSubscription.findMany({
    where: { status: "ACTIVE" },
  });
  const grossPaisa = subs.reduce((s, x) => s + x.pricePaisa, 0);
  const split = splitTutorRevenue({ grossPaisa });

  await prisma.revenueShareLedger.upsert({
    where: {
      institutionId_period: { institutionId: institution.id, period },
    },
    update: {
      grossPaisa: split.grossPaisa,
      platformSharePaisa: split.platformSharePaisa,
      institutionSharePaisa: split.institutionSharePaisa,
    },
    create: {
      institutionId: institution.id,
      period,
      grossPaisa: split.grossPaisa,
      platformSharePaisa: split.platformSharePaisa,
      institutionSharePaisa: split.institutionSharePaisa,
    },
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "upsert",
    entityType: "RevenueShareLedger",
    entityId: period,
  });

  revalidatePath("/tutor");
}

export async function createSurvey(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required");

  const survey = await db.survey.create({
    data: { title, active: true } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "Survey",
    entityId: survey.id,
  });

  revalidatePath("/surveys");
}

export async function submitSurveyResponse(formData: FormData) {
  const { db } = await requireTenantContext();
  const surveyId = String(formData.get("surveyId") || "");
  const rating = Number(formData.get("rating") || 0);
  const comment = String(formData.get("comment") || "") || null;
  if (!surveyId || rating < 1 || rating > 5) throw new Error("Invalid response");

  await db.surveyResponse.create({
    data: { surveyId, rating, comment } as never,
  });
  revalidatePath("/surveys");
}

export async function upsertCompetitor(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");

  const watch = await db.competitorWatch.create({
    data: {
      name,
      area: String(formData.get("area") || "") || null,
      feeNotes: String(formData.get("feeNotes") || "") || null,
      batchNotes: String(formData.get("batchNotes") || "") || null,
      adNotes: String(formData.get("adNotes") || "") || null,
      lastCheckedAt: new Date(),
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "CompetitorWatch",
    entityId: watch.id,
  });

  revalidatePath("/competitors");
}

export async function createTransportRoute(formData: FormData) {
  const { db, institution, session } = await requireTenantContext();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");

  const route = await db.transportRoute.create({
    data: {
      name,
      driverPhone: String(formData.get("driverPhone") || "") || null,
      vehicleLabel: String(formData.get("vehicleLabel") || "") || null,
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "TransportRoute",
    entityId: route.id,
  });

  revalidatePath("/transport");
}

export async function pingTransport(formData: FormData) {
  const { db, institution } = await requireTenantContext();
  const routeId = String(formData.get("routeId") || "");
  const lat = Number(formData.get("lat") || 0);
  const lng = Number(formData.get("lng") || 0);
  if (!routeId) throw new Error("Route required");

  await db.transportPing.create({
    data: { routeId, lat, lng } as never,
  });

  await getQueues().transport.add(
    "eta-alert",
    { institutionId: institution.id, routeId, lat, lng },
    { jobId: `eta:${routeId}:${Date.now()}` },
  );

  revalidatePath("/transport");
}

export async function issueParentMagicLink(guardianId: string) {
  const { db, institution, session } = await requireTenantContext();
  const token = createParentMagicToken();
  const link = await db.parentMagicLink.create({
    data: {
      guardianId,
      token,
      expiresAt: magicLinkExpiresAt(),
    } as never,
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "create",
    entityType: "ParentMagicLink",
    entityId: link.id,
  });

  revalidatePath("/portal");
  void token;
}

export async function connectInstagramSandbox() {
  const { institution, session } = await requireTenantContext();
  await prisma.instagramConnection.upsert({
    where: { institutionId: institution.id },
    update: { connectedAt: new Date(), pageId: "sandbox-page" },
    create: {
      institutionId: institution.id,
      pageId: "sandbox-page",
      connectedAt: new Date(),
    },
  });

  await writeAudit({
    institutionId: institution.id,
    actorId: session.user.id,
    action: "connect",
    entityType: "InstagramConnection",
    entityId: institution.id,
  });

  revalidatePath("/settings");
}

// Keep gradeOmrMock imported for worker-side parity in tests / demos
void gradeOmrMock;
void craftWeeklyProgressNote;
void computeRiskScore;
void buildMonthlyRoiReport;
void isAutomationRecovered;
