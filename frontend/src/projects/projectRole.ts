import type { ProjectMemberRole } from "../api/types";

export function resolveActorProjectRole(input: {
  actorId: string;
  ownerUserId: string;
  membershipRole: ProjectMemberRole | null;
}): ProjectMemberRole | null {
  if (input.actorId === input.ownerUserId) {
    return "OWNER";
  }
  return input.membershipRole;
}

export function canEditProject(role: ProjectMemberRole | null): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function canArchiveProject(role: ProjectMemberRole | null): boolean {
  return role === "OWNER";
}

export function canManageMembers(role: ProjectMemberRole | null): boolean {
  return role === "OWNER";
}

export function canWriteProjectTasks(role: ProjectMemberRole | null): boolean {
  return role === "OWNER" || role === "EDITOR";
}
