export type AuthorizedProjectSnapshot = {
  id: string;
  ownerUserId: string;
  archivedAt: Date | null;
};

export interface TaskAuthorizationPort {
  requireTaskRead(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot>;
  requireTaskWrite(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot>;
}
