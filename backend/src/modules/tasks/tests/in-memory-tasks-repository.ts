import { TaskNotFoundError } from "../domain/errors";
import { Task } from "../domain/task";
import type {
  CreateTaskInput,
  ListTasksFilters,
  TasksRepository,
  UpdateTaskInput,
} from "../repository/tasks-repository";

export class InMemoryTasksRepository implements TasksRepository {
  readonly tasksById = new Map<string, Task>();

  async create(input: CreateTaskInput): Promise<Task> {
    const task = Task.create(
      input.projectId,
      input.title,
      input.description,
      input.status,
      input.priority,
      input.dueDate,
    );
    this.tasksById.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasksById.get(id) ?? null;
  }

  async listByProjectId(
    projectId: string,
    filters: ListTasksFilters = {},
  ): Promise<Task[]> {
    return [...this.tasksById.values()]
      .filter((task) => {
        if (task.projectId !== projectId || task.deletedAt !== null) {
          return false;
        }
        if (filters.status !== undefined && task.status !== filters.status) {
          return false;
        }
        if (
          filters.priority !== undefined &&
          task.priority !== filters.priority
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const allowed = new Set(projectIds);
    return [...this.tasksById.values()]
      .filter(
        (task) => allowed.has(task.projectId) && task.deletedAt === null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const updated = existing.withDetails(input);
    this.tasksById.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const deleted = existing.softDelete();
    this.tasksById.set(id, deleted);
    return deleted;
  }
}
