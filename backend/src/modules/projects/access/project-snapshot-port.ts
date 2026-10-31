export type ProjectSnapshot = {
  id: string;
  ownerUserId: string;
  archivedAt: Date | null;
};

export interface ProjectSnapshotPort {
  findById(id: string): Promise<ProjectSnapshot | null>;
  listActiveIdsByOwnerId(ownerUserId: string): Promise<string[]>;
  listActiveIds(ids: string[]): Promise<string[]>;
}
