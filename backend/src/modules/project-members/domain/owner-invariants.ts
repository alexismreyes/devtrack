import { OwnerMembershipConflictError } from "./errors";
import type { ProjectMemberRole } from "./project-member";

export type MembershipRoleRef = {
  userId: string;
  role: ProjectMemberRole;
};

export function projectHasOwner(
  ownerUserId: string,
  members: readonly MembershipRoleRef[],
): boolean {
  if (ownerUserId !== "") {
    return true;
  }
  return members.some((member) => member.role === "OWNER");
}

export function assertCanRemoveMember(input: {
  targetUserId: string;
  ownerUserId: string;
  members: readonly MembershipRoleRef[];
}): void {
  if (input.targetUserId === input.ownerUserId) {
    throw new OwnerMembershipConflictError();
  }
  const remaining = input.members.filter(
    (member) => member.userId !== input.targetUserId,
  );
  if (!projectHasOwner(input.ownerUserId, remaining)) {
    throw new OwnerMembershipConflictError();
  }
}

export function assertCanChangeMemberRole(input: {
  targetUserId: string;
  ownerUserId: string;
  nextRole: ProjectMemberRole;
  members: readonly MembershipRoleRef[];
}): void {
  if (input.targetUserId === input.ownerUserId && input.nextRole !== "OWNER") {
    throw new OwnerMembershipConflictError();
  }
  const nextMembers = input.members.map((member) =>
    member.userId === input.targetUserId
      ? { userId: member.userId, role: input.nextRole }
      : member,
  );
  if (!projectHasOwner(input.ownerUserId, nextMembers)) {
    throw new OwnerMembershipConflictError();
  }
}
