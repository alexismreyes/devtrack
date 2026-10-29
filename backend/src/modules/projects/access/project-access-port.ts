export type OwnedProjectSnapshot = {
  id: string;
  ownerUserId: string;
  archivedAt: Date | null;
};

export interface ProjectAccessPort {
  requireOwnedProject(
    actorId: string,
    projectId: string,
  ): Promise<OwnedProjectSnapshot>;
}
