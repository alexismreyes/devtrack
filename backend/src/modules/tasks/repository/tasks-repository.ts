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
};

export interface TasksRepository {
  create(input: CreateTaskInput): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  listByProjectId(
    projectId: string,
    filters?: ListTasksFilters,
  ): Promise<Task[]>;
  listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]>;
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  softDelete(id: string): Promise<Task>;
}
