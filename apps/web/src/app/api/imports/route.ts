import { NextRequest, NextResponse } from "next/server";
import { requireApiTenant } from "@/lib/api-auth";
import {
  detectColumnMapping,
  applyMapping,
  validateImportRow,
  type ImportField,
} from "@maxtrone/core";
import { getQueues } from "@/lib/queues";

export async function POST(req: NextRequest) {
  const ctx = await requireApiTenant(req, "students.write");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db, institution } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV needs header + rows" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]!);
  const mapping = detectColumnMapping(headers);
  const preview = [];
  for (let i = 1; i < Math.min(lines.length, 21); i++) {
    const values = parseCsvLine(lines[i]!);
    const row = applyMapping(headers, values, mapping as Record<string, ImportField>, i + 1);
    preview.push(validateImportRow(row));
  }

  const job = await db.importJob.create({
    data: {
      filename: file.name,
      status: "PENDING",
      totalRows: Math.max(0, lines.length - 1),
      mapping,
    } as never,
  });

  // Store raw CSV content in errorReport temporarily for worker (Phase 1 simple)
  await db.importJob.update({
    where: { id: job.id },
    data: {
      errorReport: { csv: text, headers, mapping },
      status: "IMPORTING",
    },
  });

  const queues = getQueues();
  await queues.imports.add(
    "student-import",
    {
      institutionId: institution.id,
      importJobId: job.id,
      idempotencyKey: `import:${job.id}`,
    },
    {
      jobId: `import:${job.id}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  );

  return NextResponse.json({
    jobId: job.id,
    mapping,
    preview,
    totalRows: Math.max(0, lines.length - 1),
  });
}

export async function GET(req: NextRequest) {
  const ctx = await requireApiTenant(req, "students.read");
  if ("error" in ctx && ctx.error) return ctx.error;
  const { db } = ctx as Exclude<typeof ctx, { error: NextResponse }>;
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    const jobs = await db.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ jobs });
  }
  const job = await db.importJob.findFirst({ where: { id: jobId } });
  return NextResponse.json({ job });
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
