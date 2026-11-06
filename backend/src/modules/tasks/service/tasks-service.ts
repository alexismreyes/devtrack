import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UnitOfWork } from "../../projects/access/unit-of-work";
import type { ProjectAccessPort } from "../../projects/access/project-access-port";
import {
  buildCompletionByProject,
  summarizeDashboard,
  type DashboardSummary,
} from "../domain/dashboard-summary";
import { TaskNotFoundError, TaskParentArchivedError } from "../domain/errors";
import type { LabelColor } from "../domain/project-label";
import {
  assertStatusKeyInCatalog,
  resolveDefaultStatusKey,
} from "../domain/project-status";
import type { Task } from "../domain/task";
import {
  buildTaskFieldChanges,
  TaskActivityEvent,
} from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import type { AttachmentsRepository } from "../repository/attachments-repository";
import type { StatusesRepository } from "../repository/statuses-repository";
import type { TaskLabelsRepository } from "../repository/task-labels-repository";
import type {
  ListTasksFilters,
  TasksRepository,
  UpdateTaskInput,
} from "../repository/tasks-repository";
import {
  isCoverImageContentType,
  type TaskCoverSummary,
} from "../domain/task-attachment";

export type CreateTaskCommand = {
  title: string;
  description: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  dueDate: Date | null;
};

export type TaskLabelSummary = {
  id: string;
  name: string;
  color: LabelColor;
};

export type TaskView = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  dueDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  labels: TaskLabelSummary[];
  cover: TaskCoverSummary | null;
};

export class TasksService {
  constructor(
    private readonly tasks: TasksRepository,
    private readonly projects: ProjectAccessPort,
    private readonly authorization: TaskAuthorizationPort,
    private readonly activity: ActivityRepository,
    private readonly taskLabels: TaskLabelsRepository,
    private readonly attachments: AttachmentsRepository,
    private readonly statuses: StatusesRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(
    actorId: string,
    projectId: string,
    input: CreateTaskCommand,
  ): Promise<TaskView> {
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const catalog = await this.statuses.listByProjectId(projectId);
    const statusKey =
      input.status === undefined
        ? resolveDefaultStatusKey(catalog)
        : assertStatusKeyInCatalog(catalog, projectId, input.status).key;
    const task = await this.unitOfWork.run(async () => {
      const created = await this.tasks.create({
        projectId,
        title: input.title,
        description: input.description,
        status: statusKey,
        priority: input.priority,
        dueDate: input.dueDate,
      });
      await this.activity.create(
        TaskActivityEvent.taskCreated(created.id, actorId),
      );
      return created;
    });
    return this.toView(task, [], null);
  }

  async listByProject(
    actorId: string,
    projectId: string,
    filters: ListTasksFilters = {},
  ): Promise<TaskView[]> {
    await this.authorization.requireTaskRead(actorId, projectId);
    if (filters.status !== undefined) {
      const catalog = await this.statuses.listByProjectId(projectId);
      assertStatusKeyInCatalog(catalog, projectId, filters.status);
    }
    const tasks = await this.tasks.listByProjectId(projectId, filters);
    return this.toViews(tasks);
  }

  async getDashboard(
    actorId: string,
    now: Date = new Date(),
  ): Promise<DashboardSummary> {
    const owned = await this.projects.listOwnedActiveProjects(actorId);
    const projectIds = owned.map((project) => project.id);
    const tasks = await this.tasks.listNonDeletedByProjectIds(projectIds);
    const statuses = await this.statuses.listByProjectIds(projectIds);
    return summarizeDashboard(
      owned,
      tasks,
      now,
      buildCompletionByProject(statuses),
    );
  }

  async getById(actorId: string, taskId: string): Promise<TaskView> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    return this.toViewWithLabels(task);
  }

  async update(
    actorId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    let nextInput = input;
    if (input.status !== undefined) {
      const catalog = await this.statuses.listByProjectId(task.projectId);
      const resolved = assertStatusKeyInCatalog(
        catalog,
        task.projectId,
        input.status,
      );
      nextInput = { ...input, status: resolved.key };
    }
    const changes = buildTaskFieldChanges(task, nextInput);
    // Validate normalized update even when no-op (preserve prior invariant).
    task.withDetails(nextInput);
    const updated = await this.unitOfWork.run(async () => {
      const next = await this.tasks.update(taskId, nextInput);
      if (changes.length > 0) {
        await this.activity.create(
          TaskActivityEvent.taskFieldsChanged(taskId, actorId, changes),
        );
      }
      return next;
    });
    return this.toViewWithLabels(updated);
  }

  async softDelete(actorId: string, taskId: string): Promise<Task> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.unitOfWork.run(async () => {
      const deleted = await this.tasks.softDelete(taskId);
      await this.activity.create(
        TaskActivityEvent.taskSoftDeleted(taskId, actorId),
      );
      return deleted;
    });
  }

  private async requireLiveTask(taskId: string): Promise<Task> {
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

  private async toViewWithLabels(task: Task): Promise<TaskView> {
    const byTask = await this.taskLabels.listForTaskIds([task.id]);
    const covers = await this.coverMapForTasks([task]);
    return this.toView(
      task,
      byTask.get(task.id) ?? [],
      covers.get(task.id) ?? null,
    );
  }

  private async toViews(tasks: Task[]): Promise<TaskView[]> {
    const byTask = await this.taskLabels.listForTaskIds(
      tasks.map((task) => task.id),
    );
    const covers = await this.coverMapForTasks(tasks);
    return tasks.map((task) =>
      this.toView(
        task,
        byTask.get(task.id) ?? [],
        covers.get(task.id) ?? null,
      ),
    );
  }

  private async coverMapForTasks(
    tasks: Task[],
  ): Promise<Map<string, TaskCoverSummary>> {
    const rows = await this.attachments.listCoverSummariesForTaskIds(
      tasks.map((task) => task.id),
    );
    const map = new Map<string, TaskCoverSummary>();
    for (const row of rows) {
      if (!isCoverImageContentType(row.contentType)) {
        continue;
      }
      map.set(row.taskId, {
        attachmentId: row.attachmentId,
        contentType: row.contentType,
      });
    }
    return map;
  }

  private toView(
    task: Task,
    labels: Array<{ id: string; name: string; color: LabelColor }>,
    cover: TaskCoverSummary | null,
  ): TaskView {
    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      deletedAt: task.deletedAt,
      labels: labels.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
      cover,
    };
  }
}
