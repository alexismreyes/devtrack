import { ProjectBoardBackground } from "../domain/project-board-background";
import type {
  CreateProjectBoardBackgroundInput,
  DeletedProjectBoardBackgroundSnapshot,
  ProjectBoardBackgroundSummaryRow,
  ProjectBoardBackgroundsRepository,
} from "../repository/project-board-backgrounds-repository";

export class InMemoryProjectBoardBackgroundsRepository
  implements ProjectBoardBackgroundsRepository
{
  readonly boardBackgroundsByProjectId = new Map<string, ProjectBoardBackground>();

  async create(input: CreateProjectBoardBackgroundInput): Promise<ProjectBoardBackground> {
    this.boardBackgroundsByProjectId.set(input.boardBackground.projectId, input.boardBackground);
    return input.boardBackground;
  }

  async findByProjectId(projectId: string): Promise<ProjectBoardBackground | null> {
    return this.boardBackgroundsByProjectId.get(projectId) ?? null;
  }

  async deleteByProjectId(
    projectId: string,
  ): Promise<DeletedProjectBoardBackgroundSnapshot | null> {
    const existing = this.boardBackgroundsByProjectId.get(projectId);
    if (existing === undefined) {
      return null;
    }
    this.boardBackgroundsByProjectId.delete(projectId);
    return {
      id: existing.id,
      projectId: existing.projectId,
      originalFilename: existing.originalFilename,
      contentType: existing.contentType,
      sizeBytes: existing.sizeBytes,
      storageKey: existing.storageKey,
      createdAt: existing.createdAt,
      uploadedByUserId: existing.uploadedByUserId,
    };
  }

  async replaceForProject(
    projectId: string,
    boardBackground: ProjectBoardBackground,
  ): Promise<{
    saved: ProjectBoardBackground;
    previous: DeletedProjectBoardBackgroundSnapshot | null;
  }> {
    const previous = await this.deleteByProjectId(projectId);
    this.boardBackgroundsByProjectId.set(projectId, boardBackground);
    return { saved: boardBackground, previous };
  }

  async listSummariesForProjectIds(
    projectIds: string[],
  ): Promise<ProjectBoardBackgroundSummaryRow[]> {
    const wanted = new Set(projectIds);
    const summaries: ProjectBoardBackgroundSummaryRow[] = [];
    for (const [projectId, boardBackground] of this.boardBackgroundsByProjectId) {
      if (!wanted.has(projectId)) {
        continue;
      }
      summaries.push({
        projectId,
        boardBackgroundId: boardBackground.id,
        contentType: boardBackground.contentType,
      });
    }
    return summaries;
  }
}
