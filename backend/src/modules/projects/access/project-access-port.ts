export type OwnedProjectSnapshot = {
  id: string;
  ownerUserId: string;
  name: string;
  archivedAt: Date | null;
};

export interface ProjectAccessPort {
  requireOwnedProject(
    actorId: string,
    projectId: string,
  ): Promise<OwnedProjectSnapshot>;
  listOwnedActiveProjects(actorId: string): Promise<OwnedProjectSnapshot[]>;
  /** Active (non-archived) projects for the given ids, newest-first. */
  listActiveProjectsByIds(ids: string[]): Promise<OwnedProjectSnapshot[]>;
}
