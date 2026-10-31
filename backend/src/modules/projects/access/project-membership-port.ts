export type ProjectAccessOperation =
  | "read_project"
  | "patch_project"
  | "archive_project"
  | "unarchive_project";

export type ProjectAuthorizationSnapshot = {
  id: string;
  ownerUserId: string;
  archivedAt: Date | null;
};

export interface ProjectMembershipQueryPort {
  listAuthorizedActiveProjectIds(actorId: string): Promise<string[]>;
  assertAuthorized(
    actorId: string,
    project: ProjectAuthorizationSnapshot,
    operation: ProjectAccessOperation,
  ): Promise<void>;
}

export interface OwnerMembershipWritePort {
  insertCreatingOwner(projectId: string, userId: string): Promise<void>;
}
