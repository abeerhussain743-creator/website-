import { prisma } from "@maxtrone/db";

export async function writeAudit(input: {
  institutionId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  diff?: unknown;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      institutionId: input.institutionId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      diff: input.diff as object | undefined,
      metadata: input.metadata as object | undefined,
    },
  });
}
