import type { ProjectAccessPort } from "../../projects/access/project-access-port";
import { TaskNotFoundError, TaskParentArchivedError } from "../domain/errors";
import type { Task } from "../domain/task";
import type {
  ListTasksFilters,
  TasksRepository,
  UpdateTaskInput,
} from "../repository/tasks-repository";

export type CreateTaskCommand = {
  title: string;
  description: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  dueDate: Date | null;
};

export class TasksService {
  constructor(
    private readonly tasks: TasksRepository,
    private readonly projects: ProjectAccessPort,
  ) {}

  async create(
    actorId: string,
    projectId: string,
    input: CreateTaskCommand,
  ): Promise<Task> {
    const snapshot = await this.projects.requireOwnedProject(actorId, projectId);
    this.assertParentWritable(snapshot.archivedAt);
    return this.tasks.create({
      projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
    });
  }

  async listByProject(
    actorId: string,
    projectId: string,
    filters: ListTasksFilters = {},
  ): Promise<Task[]> {
    await this.projects.requireOwnedProject(actorId, projectId);
    return this.tasks.listByProjectId(projectId, filters);
  }

  async getById(actorId: string, taskId: string): Promise<Task> {
    const task = await this.requireLiveTask(taskId);
    await this.projects.requireOwnedProject(actorId, task.projectId);
    return task;
  }

  async update(
    actorId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.projects.requireOwnedProject(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    task.withDetails(input);
    return this.tasks.update(taskId, input);
  }

  async softDelete(actorId: string, taskId: string): Promise<Task> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.projects.requireOwnedProject(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.tasks.softDelete(taskId);
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
}
