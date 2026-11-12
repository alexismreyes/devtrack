import type { ProjectBoardBackground } from "../domain/project-board-background";

export type CreateProjectBoardBackgroundInput = {
  boardBackground: ProjectBoardBackground;
};

/** Snapshot returned by hard-delete for blob cleanup. */
export type DeletedProjectBoardBackgroundSnapshot = {
  id: string;
  projectId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
  uploadedByUserId: string;
};

export type ProjectBoardBackgroundSummaryRow = {
  projectId: string;
  boardBackgroundId: string;
  contentType: string;
};

export interface ProjectBoardBackgroundsRepository {
  create(input: CreateProjectBoardBackgroundInput): Promise<ProjectBoardBackground>;
  findByProjectId(projectId: string): Promise<ProjectBoardBackground | null>;
  /** Hard-deletes the boardBackground row for the project when present. */
  deleteByProjectId(
    projectId: string,
  ): Promise<DeletedProjectBoardBackgroundSnapshot | null>;
  /**
   * Replaces any existing boardBackground for the project with the new boardBackground in one
   * transactional unit (caller supplies UnitOfWork when needed).
   */
  replaceForProject(
    projectId: string,
    boardBackground: ProjectBoardBackground,
  ): Promise<{
    saved: ProjectBoardBackground;
    previous: DeletedProjectBoardBackgroundSnapshot | null;
  }>;
  listSummariesForProjectIds(
    projectIds: string[],
  ): Promise<ProjectBoardBackgroundSummaryRow[]>;
}
