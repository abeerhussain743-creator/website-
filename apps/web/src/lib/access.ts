import { auth } from "@/auth";
import { prisma, MembershipRole } from "@postpilot/db";
import { canEditContent, type Role } from "@postpilot/shared";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return session;
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId, deletedAt: null },
    include: {
      organization: true,
      workspace: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export class WorkspaceAccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function assertWorkspaceAccess(
  userId: string,
  workspaceId: string,
  minimum: Role = "CLIENT_APPROVER",
) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
  });
  if (!workspace) {
    throw new WorkspaceAccessError("Workspace not found", 404);
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId: workspace.organizationId,
      deletedAt: null,
    },
  });
  if (!membership) {
    throw new WorkspaceAccessError("Forbidden", 403);
  }

  if (
    membership.role === MembershipRole.CLIENT_APPROVER &&
    membership.workspaceId &&
    membership.workspaceId !== workspaceId
  ) {
    throw new WorkspaceAccessError("Forbidden", 403);
  }

  const role = membership.role as Role;

  if (minimum === "OWNER" && role !== "OWNER") {
    throw new WorkspaceAccessError("Forbidden", 403);
  }
  if (minimum === "ADMIN" && role !== "OWNER" && role !== "ADMIN") {
    throw new WorkspaceAccessError("Forbidden", 403);
  }
  if (minimum === "EDITOR" && !canEditContent(role)) {
    throw new WorkspaceAccessError("Forbidden", 403);
  }

  return { workspace, membership, role };
}
