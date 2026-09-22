import { Prisma, PrismaClient } from "@prisma/client";

/** Models that must always be filtered by institutionId. */
export const TENANT_MODELS = [
  "branch",
  "role",
  "membership",
  "terminologyMap",
  "academicSession",
  "group",
  "subgroup",
  "student",
  "guardian",
  "studentGuardian",
  "enrollment",
  "task",
  "auditLog",
  "usageMeter",
  "webhookEvent",
  "jobFailure",
  "institutionEntitlementOverride",
  "attendanceSession",
  "attendanceRecord",
  "staffAttendance",
  "leadSource",
  "leadStage",
  "lead",
  "leadActivity",
  "bookingSlot",
  "booking",
  "referral",
  "siblingProspect",
  "knowledgeBaseEntry",
  "aIInteraction",
  "sequence",
  "sequenceStep",
  "sequenceEnrollment",
  "feeHead",
  "feeStructure",
  "feeAssignment",
  "discount",
  "lateFeeRule",
  "installmentPlan",
  "invoice",
  "invoiceLine",
  "payment",
  "paymentAllocation",
  "refund",
  "recoveryLadder",
  "recoveryStep",
  "recoveryRun",
  "conversation",
  "message",
  "messageTemplate",
  "broadcast",
  "broadcastRecipient",
  "optInRecord",
  "briefing",
  "importJob",
  "institutionInvite",
  "whatsAppConnection",
  "voiceNote",
  "voiceCall",
  "subject",
  "test",
  "testQuestion",
  "mark",
  "oMRSheet",
  "oMRScan",
  "reportCard",
  "progressNote",
  "riskScore",
  "monthlyReport",
  "instagramConnection",
  "syllabusDocument",
  "syllabusChunk",
  "tutorEnrollment",
  "tutorSubscription",
  "tutorSession",
  "tutorMessage",
  "revenueShareLedger",
  "safeguardingAlert",
  "survey",
  "surveyResponse",
  "competitorWatch",
  "transportRoute",
  "transportPing",
  "transportAlert",
  "parentMagicLink",
] as const;

export type TenantModel = (typeof TENANT_MODELS)[number];

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

type TenantClient = ReturnType<typeof buildTenantClient>;

function assertInstitutionId(institutionId: string) {
  if (!institutionId || typeof institutionId !== "string") {
    throw new TenantScopeError("institutionId is required for tenant-scoped queries");
  }
}

function injectWhere(
  args: Record<string, unknown> | undefined,
  institutionId: string,
): Record<string, unknown> {
  const next = { ...(args ?? {}) };
  const where = (next.where as Record<string, unknown> | undefined) ?? {};
  if ("institutionId" in where && where.institutionId !== institutionId) {
    throw new TenantScopeError(
      `Cross-tenant filter blocked: expected ${institutionId}, got ${String(where.institutionId)}`,
    );
  }
  next.where = { ...where, institutionId };
  return next;
}

function injectData(
  args: Record<string, unknown> | undefined,
  institutionId: string,
  multi = false,
): Record<string, unknown> {
  const next = { ...(args ?? {}) };
  if (multi) {
    const data = next.data;
    if (Array.isArray(data)) {
      next.data = data.map((row) => ({
        ...(row as Record<string, unknown>),
        institutionId,
      }));
    }
    return next;
  }
  const data = (next.data as Record<string, unknown> | undefined) ?? {};
  if ("institutionId" in data && data.institutionId !== institutionId) {
    throw new TenantScopeError(
      `Cross-tenant write blocked: expected ${institutionId}, got ${String(data.institutionId)}`,
    );
  }
  next.data = { ...data, institutionId };
  return next;
}

function buildTenantClient(base: PrismaClient, institutionId: string) {
  assertInstitutionId(institutionId);

  const extension = Prisma.defineExtension({
    name: "tenantScope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelName = model.charAt(0).toLowerCase() + model.slice(1);
          if (!TENANT_MODELS.includes(modelName as TenantModel)) {
            if (modelName === "institution") {
              if (operation === "findUnique" || operation === "findFirst") {
                return query(args);
              }
              if (operation.startsWith("find") || operation === "count" || operation === "aggregate") {
                return query(injectWhere(args as Record<string, unknown>, institutionId));
              }
            }
            return query(args);
          }

          const opsNeedingWhere = [
            "findMany",
            "findFirst",
            "findUnique",
            "findFirstOrThrow",
            "findUniqueOrThrow",
            "count",
            "aggregate",
            "groupBy",
            "update",
            "updateMany",
            "delete",
            "deleteMany",
          ];
          const opsNeedingData = ["create", "createMany", "upsert"];

          let nextArgs = args as Record<string, unknown>;
          if (opsNeedingWhere.includes(operation)) {
            nextArgs = injectWhere(nextArgs, institutionId);
          }
          if (operation === "create" || operation === "upsert") {
            nextArgs = injectData(nextArgs, institutionId, false);
          }
          if (operation === "createMany") {
            nextArgs = injectData(nextArgs, institutionId, true);
          }
          if (
            opsNeedingData.includes(operation) === false &&
            opsNeedingWhere.includes(operation) === false
          ) {
            if (nextArgs && typeof nextArgs === "object" && "where" in nextArgs) {
              nextArgs = injectWhere(nextArgs, institutionId);
            }
          }

          return query(nextArgs);
        },
      },
    },
  });

  return base.$extends(extension);
}

export function createTenantClient(base: PrismaClient, institutionId: string): TenantClient {
  return buildTenantClient(base, institutionId);
}

export type { TenantClient };
