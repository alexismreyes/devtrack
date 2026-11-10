import type { ProjectCover } from "../domain/project-cover";

export type CreateProjectCoverInput = {
  cover: ProjectCover;
};

/** Snapshot returned by hard-delete for blob cleanup. */
export type DeletedProjectCoverSnapshot = {
  id: string;
  projectId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
  uploadedByUserId: string;
};

export type ProjectCoverSummaryRow = {
  projectId: string;
  coverId: string;
  contentType: string;
};

export interface ProjectCoversRepository {
  create(input: CreateProjectCoverInput): Promise<ProjectCover>;
  findByProjectId(projectId: string): Promise<ProjectCover | null>;
  /** Hard-deletes the cover row for the project when present. */
  deleteByProjectId(
    projectId: string,
  ): Promise<DeletedProjectCoverSnapshot | null>;
  /**
   * Replaces any existing cover for the project with the new cover in one
   * transactional unit (caller supplies UnitOfWork when needed).
   */
  replaceForProject(
    projectId: string,
    cover: ProjectCover,
  ): Promise<{
    saved: ProjectCover;
    previous: DeletedProjectCoverSnapshot | null;
  }>;
  listSummariesForProjectIds(
    projectIds: string[],
  ): Promise<ProjectCoverSummaryRow[]>;
}
