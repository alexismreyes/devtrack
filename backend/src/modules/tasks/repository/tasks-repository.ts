import type { Task, TaskPriority, TaskStatus } from "../domain/task";

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate: Date | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
};

export type ListTasksFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  labelId?: string;
};

export interface TasksRepository {
  create(input: CreateTaskInput): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  listByProjectId(
    projectId: string,
    filters?: ListTasksFilters,
  ): Promise<Task[]>;
  listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]>;
  /**
   * Updates fields. Status change appends at end of target column and densifies
   * the source column. Position is not a general PATCH field.
   */
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  /** Soft-deletes and densifies remaining live tasks in the same status column. */
  softDelete(id: string): Promise<Task>;
  /**
   * Rewrites dense positions for the exact live set in (projectId, status).
   * Empty orderedIds is valid only when the column is empty.
   */
  reorderInStatus(
    projectId: string,
    status: TaskStatus,
    orderedIds: string[],
  ): Promise<Task[]>;
}
