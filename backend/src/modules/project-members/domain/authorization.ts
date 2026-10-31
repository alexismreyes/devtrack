import { MembershipForbiddenError } from "./errors";
import type { ProjectMemberRole } from "./project-member";

export type ProjectOperation =
  | "read_project"
  | "patch_project"
  | "archive_project"
  | "unarchive_project"
  | "read_task"
  | "write_task"
  | "list_members"
  | "manage_members";

export type AuthorizationContext = {
  actorId: string;
  ownerUserId: string;
  archivedAt: Date | null;
  membershipRole: ProjectMemberRole | null;
};

export function resolveEffectiveRole(
  actorId: string,
  ownerUserId: string,
  membershipRole: ProjectMemberRole | null,
): ProjectMemberRole | null {
  if (actorId === ownerUserId) {
    return "OWNER";
  }
  return membershipRole;
}

export function isAuthorizedForOperation(
  context: AuthorizationContext,
  operation: ProjectOperation,
): boolean {
  const isArchived = context.archivedAt !== null;
  const isCreatingOwner = context.actorId === context.ownerUserId;
  const role = resolveEffectiveRole(
    context.actorId,
    context.ownerUserId,
    context.membershipRole,
  );

  if (role === null) {
    return false;
  }

  if (isArchived && !isCreatingOwner) {
    return false;
  }

  switch (operation) {
    case "read_project":
    case "list_members":
    case "read_task":
      return true;
    case "patch_project":
    case "write_task":
      return role === "OWNER" || role === "EDITOR";
    case "archive_project":
    case "unarchive_project":
    case "manage_members":
      return role === "OWNER";
  }
}

export function assertAuthorizedForOperation(
  context: AuthorizationContext,
  operation: ProjectOperation,
): void {
  if (!isAuthorizedForOperation(context, operation)) {
    throw new MembershipForbiddenError();
  }
}
