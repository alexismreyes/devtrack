import { ProjectCover } from "../domain/project-cover";
import type {
  CreateProjectCoverInput,
  DeletedProjectCoverSnapshot,
  ProjectCoverSummaryRow,
  ProjectCoversRepository,
} from "../repository/project-covers-repository";

export class InMemoryProjectCoversRepository
  implements ProjectCoversRepository
{
  readonly coversByProjectId = new Map<string, ProjectCover>();

  async create(input: CreateProjectCoverInput): Promise<ProjectCover> {
    this.coversByProjectId.set(input.cover.projectId, input.cover);
    return input.cover;
  }

  async findByProjectId(projectId: string): Promise<ProjectCover | null> {
    return this.coversByProjectId.get(projectId) ?? null;
  }

  async deleteByProjectId(
    projectId: string,
  ): Promise<DeletedProjectCoverSnapshot | null> {
    const existing = this.coversByProjectId.get(projectId);
    if (existing === undefined) {
      return null;
    }
    this.coversByProjectId.delete(projectId);
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
    cover: ProjectCover,
  ): Promise<{
    saved: ProjectCover;
    previous: DeletedProjectCoverSnapshot | null;
  }> {
    const previous = await this.deleteByProjectId(projectId);
    this.coversByProjectId.set(projectId, cover);
    return { saved: cover, previous };
  }

  async listSummariesForProjectIds(
    projectIds: string[],
  ): Promise<ProjectCoverSummaryRow[]> {
    const wanted = new Set(projectIds);
    const summaries: ProjectCoverSummaryRow[] = [];
    for (const [projectId, cover] of this.coversByProjectId) {
      if (!wanted.has(projectId)) {
        continue;
      }
      summaries.push({
        projectId,
        coverId: cover.id,
        contentType: cover.contentType,
      });
    }
    return summaries;
  }
}
