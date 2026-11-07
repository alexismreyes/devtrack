import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import {
  StatusNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import {
  assertCanDeleteStatus,
  assertCanSetIsCompleted,
  type ProjectStatus,
  type StatusColor,
} from "../domain/project-status";
import type { StatusesRepository } from "../repository/statuses-repository";

export class StatusesService {
  constructor(
    private readonly statuses: StatusesRepository,
    private readonly authorization: TaskAuthorizationPort,
  ) {}

  async listByProject(
    actorId: string,
    projectId: string,
  ): Promise<ProjectStatus[]> {
    await this.authorization.requireTaskRead(actorId, projectId);
    return this.statuses.listByProjectId(projectId);
  }

  async create(
    actorId: string,
    projectId: string,
    input: { name: string; color: StatusColor; isCompleted?: boolean },
  ): Promise<ProjectStatus> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.statuses.create({
      projectId,
      name: input.name,
      color: input.color,
      isCompleted: input.isCompleted,
    });
  }

  async update(
    actorId: string,
    projectId: string,
    statusId: string,
    input: { name?: string; color?: StatusColor; isCompleted?: boolean },
  ): Promise<ProjectStatus> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const existing = await this.statuses.findByIdInProject(projectId, statusId);
    if (existing === null) {
      throw new StatusNotFoundError();
    }
    if (input.isCompleted !== undefined) {
      const catalog = await this.statuses.listByProjectId(projectId);
      assertCanSetIsCompleted(catalog, existing, input.isCompleted);
    }
    return this.statuses.update(existing.id, input);
  }

  async delete(
    actorId: string,
    projectId: string,
    statusId: string,
  ): Promise<void> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const existing = await this.statuses.findByIdInProject(projectId, statusId);
    if (existing === null) {
      throw new StatusNotFoundError();
    }
    const catalog = await this.statuses.listByProjectId(projectId);
    const inUse = await this.statuses.countLiveTasksByStatusKey(
      projectId,
      existing.key,
    );
    assertCanDeleteStatus(catalog, existing, inUse);
    await this.statuses.delete(existing.id);
  }

  async reorder(
    actorId: string,
    projectId: string,
    orderedIds: string[],
  ): Promise<ProjectStatus[]> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.statuses.reorder(projectId, orderedIds);
  }

  private assertParentWritable(archivedAt: Date | null): void {
    if (archivedAt !== null) {
      throw new TaskParentArchivedError();
    }
  }
}
