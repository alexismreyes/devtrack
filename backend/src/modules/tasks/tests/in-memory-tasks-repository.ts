import { TaskNotFoundError } from "../domain/errors";
import {
  applyTaskReorder,
  densifyLiveTasks,
  nextTaskPosition,
  sortTasksByPositionAsc,
  Task,
  type TaskStatus,
} from "../domain/task";
import type { TaskLabelJoinStore } from "../repository/task-labels-repository";
import type {
  CreateTaskInput,
  ListTasksFilters,
  TasksRepository,
  UpdateTaskInput,
} from "../repository/tasks-repository";

export class InMemoryTasksRepository implements TasksRepository {
  readonly tasksById = new Map<string, Task>();

  constructor(private readonly labelJoins: TaskLabelJoinStore | null = null) {}

  private liveInStatus(
    projectId: string,
    status: TaskStatus,
    excludeId?: string,
  ): Task[] {
    return [...this.tasksById.values()].filter((task) => {
      if (task.projectId !== projectId || task.status !== status) {
        return false;
      }
      if (task.deletedAt !== null) {
        return false;
      }
      if (excludeId !== undefined && task.id === excludeId) {
        return false;
      }
      return true;
    });
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const status = input.status ?? "TODO";
    const position = nextTaskPosition(
      this.liveInStatus(input.projectId, status),
    );
    const task = Task.create(
      input.projectId,
      input.title,
      input.description,
      status,
      input.priority,
      input.dueDate,
      new Date(),
      position,
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
    return sortTasksByPositionAsc(
      [...this.tasksById.values()].filter((task) => {
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
        if (filters.labelId !== undefined) {
          const labeled = this.labelJoins?.byLabelId.get(filters.labelId);
          if (labeled === undefined || !labeled.has(task.id)) {
            return false;
          }
        }
        return true;
      }),
    );
  }

  async listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const allowed = new Set(projectIds);
    return sortTasksByPositionAsc(
      [...this.tasksById.values()].filter(
        (task) => allowed.has(task.projectId) && task.deletedAt === null,
      ),
    );
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const statusChanged =
      input.status !== undefined && input.status !== existing.status;
    const updated = existing.withDetails(input);

    if (!statusChanged) {
      this.tasksById.set(id, updated);
      return updated;
    }

    for (const sibling of densifyLiveTasks(
      this.liveInStatus(existing.projectId, existing.status, existing.id),
    )) {
      this.tasksById.set(sibling.id, sibling);
    }

    const appended = updated.withPosition(
      nextTaskPosition(
        this.liveInStatus(existing.projectId, updated.status, existing.id),
      ),
    );
    this.tasksById.set(id, appended);
    return appended;
  }

  async softDelete(id: string): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const deleted = existing.softDelete();
    this.tasksById.set(id, deleted);
    for (const sibling of densifyLiveTasks(
      this.liveInStatus(existing.projectId, existing.status),
    )) {
      this.tasksById.set(sibling.id, sibling);
    }
    return deleted;
  }

  async reorderInStatus(
    projectId: string,
    status: TaskStatus,
    orderedIds: string[],
  ): Promise<Task[]> {
    const existing = this.liveInStatus(projectId, status);
    const reordered = applyTaskReorder(existing, orderedIds);
    for (const task of reordered) {
      this.tasksById.set(task.id, task);
    }
    return sortTasksByPositionAsc(reordered);
  }
}
