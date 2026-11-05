import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UnitOfWork } from "../../projects/access/unit-of-work";
import {
  LabelNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import {
  assertLabelsBelongToProject,
  canonicalizeLabelIds,
  type LabelColor,
  type ProjectLabel,
  sortLabelsByNameAsc,
} from "../domain/project-label";
import type { LabelsRepository } from "../repository/labels-repository";
import type { TaskLabelsRepository } from "../repository/task-labels-repository";
import type { TasksRepository } from "../repository/tasks-repository";

export class LabelsService {
  constructor(
    private readonly labels: LabelsRepository,
    private readonly taskLabels: TaskLabelsRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async listByProject(
    actorId: string,
    projectId: string,
  ): Promise<ProjectLabel[]> {
    await this.authorization.requireTaskRead(actorId, projectId);
    return this.labels.listByProjectId(projectId);
  }

  async create(
    actorId: string,
    projectId: string,
    input: { name: string; color: LabelColor },
  ): Promise<ProjectLabel> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.labels.create({
      projectId,
      name: input.name,
      color: input.color,
    });
  }

  async update(
    actorId: string,
    projectId: string,
    labelId: string,
    input: { name?: string; color?: LabelColor },
  ): Promise<ProjectLabel> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const existing = await this.labels.findByIdInProject(projectId, labelId);
    if (existing === null) {
      throw new LabelNotFoundError();
    }
    return this.labels.update(existing.id, input);
  }

  async delete(
    actorId: string,
    projectId: string,
    labelId: string,
  ): Promise<void> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const existing = await this.labels.findByIdInProject(projectId, labelId);
    if (existing === null) {
      throw new LabelNotFoundError();
    }
    await this.unitOfWork.run(async () => {
      await this.taskLabels.deleteByLabelId(existing.id);
      await this.labels.delete(existing.id);
    });
  }

  async replaceTaskLabels(
    actorId: string,
    taskId: string,
    labelIds: string[],
  ): Promise<ProjectLabel[]> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);

    const uniqueIds = canonicalizeLabelIds(labelIds);
    const found = await this.labels.findByIdsInProject(
      task.projectId,
      uniqueIds,
    );
    assertLabelsBelongToProject(found, task.projectId, uniqueIds);

    return this.unitOfWork.run(async () => {
      await this.taskLabels.replaceSetForTask(task.id, uniqueIds);
      const byTask = await this.taskLabels.listForTaskIds([task.id]);
      return sortLabelsByNameAsc(byTask.get(task.id) ?? []);
    });
  }

  private async requireLiveTask(taskId: string) {
    const task = await this.tasks.findById(taskId);
    if (task === null || task.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    return task;
  }

  private assertParentWritable(archivedAt: Date | null): void {
    if (archivedAt !== null) {
      throw new TaskParentArchivedError();
    }
  }
}
