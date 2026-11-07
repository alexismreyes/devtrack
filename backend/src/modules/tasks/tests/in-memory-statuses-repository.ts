import {
  DuplicateStatusNameError,
  StatusNotFoundError,
} from "../domain/errors";
import {
  applyStatusReorder,
  nextCustomStatusPosition,
  ProjectStatus,
  SEEDED_STATUS_DEFINITIONS,
  sortStatusesByPositionAsc,
  type StatusColor,
} from "../domain/project-status";
import type {
  CreateStatusInput,
  StatusesRepository,
  UpdateStatusInput,
} from "../repository/statuses-repository";
import type { InMemoryTasksRepository } from "./in-memory-tasks-repository";

export class InMemoryStatusesRepository implements StatusesRepository {
  readonly statusesById = new Map<string, ProjectStatus>();

  constructor(private readonly tasks: InMemoryTasksRepository | null = null) {}

  async create(input: CreateStatusInput): Promise<ProjectStatus> {
    const existing = await this.listByProjectId(input.projectId);
    const status = ProjectStatus.createCustom(
      input.projectId,
      input.name,
      input.color,
      nextCustomStatusPosition(existing),
      input.isCompleted ?? false,
    );
    this.assertNameAvailable(status.projectId, status.nameKey);
    this.statusesById.set(status.id, status);
    return status;
  }

  async findByIdInProject(
    projectId: string,
    statusId: string,
  ): Promise<ProjectStatus | null> {
    const status = this.statusesById.get(statusId) ?? null;
    if (status === null || status.projectId !== projectId) {
      return null;
    }
    return status;
  }

  async findByKeyInProject(
    projectId: string,
    key: string,
  ): Promise<ProjectStatus | null> {
    for (const status of this.statusesById.values()) {
      if (status.projectId === projectId && status.key === key) {
        return status;
      }
    }
    return null;
  }

  async listByProjectId(projectId: string): Promise<ProjectStatus[]> {
    return sortStatusesByPositionAsc(
      [...this.statusesById.values()].filter(
        (status) => status.projectId === projectId,
      ),
    );
  }

  async listByProjectIds(projectIds: string[]): Promise<ProjectStatus[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const allowed = new Set(projectIds);
    return sortStatusesByPositionAsc(
      [...this.statusesById.values()].filter((status) =>
        allowed.has(status.projectId),
      ),
    );
  }

  async update(id: string, input: UpdateStatusInput): Promise<ProjectStatus> {
    const existing = this.statusesById.get(id);
    if (existing === undefined) {
      throw new StatusNotFoundError();
    }
    const updated = existing.withDetails(input);
    if (updated.nameKey !== existing.nameKey) {
      this.assertNameAvailable(updated.projectId, updated.nameKey, id);
    }
    this.statusesById.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.statusesById.has(id)) {
      throw new StatusNotFoundError();
    }
    this.statusesById.delete(id);
  }

  async reorder(
    projectId: string,
    orderedIds: string[],
  ): Promise<ProjectStatus[]> {
    const existing = await this.listByProjectId(projectId);
    const reordered = applyStatusReorder(existing, orderedIds);
    for (const status of reordered) {
      this.statusesById.set(status.id, status);
    }
    return reordered;
  }

  async countLiveTasksByStatusKey(
    projectId: string,
    key: string,
  ): Promise<number> {
    if (this.tasks === null) {
      return 0;
    }
    let count = 0;
    for (const task of this.tasks.tasksById.values()) {
      if (
        task.projectId === projectId &&
        task.deletedAt === null &&
        task.status === key
      ) {
        count += 1;
      }
    }
    return count;
  }

  async countNonCompleted(projectId: string): Promise<number> {
    const statuses = await this.listByProjectId(projectId);
    return statuses.filter((status) => !status.isCompleted).length;
  }

  async seedDefaultsForProject(projectId: string): Promise<ProjectStatus[]> {
    const seeded = SEEDED_STATUS_DEFINITIONS.map((definition) =>
      ProjectStatus.createSeeded(projectId, definition),
    );
    for (const status of seeded) {
      this.statusesById.set(status.id, status);
    }
    return seeded;
  }

  /** Test helper: insert a fully specified status. */
  put(status: ProjectStatus): void {
    this.statusesById.set(status.id, status);
  }

  private assertNameAvailable(
    projectId: string,
    nameKey: string,
    excludingId?: string,
  ): void {
    for (const status of this.statusesById.values()) {
      if (
        status.projectId === projectId &&
        status.nameKey === nameKey &&
        status.id !== excludingId
      ) {
        throw new DuplicateStatusNameError();
      }
    }
  }
}

export type { StatusColor };
