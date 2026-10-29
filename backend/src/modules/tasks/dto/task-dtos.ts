import {
  formatCalendarDate,
  type TaskPriority,
  type TaskStatus,
} from "../domain/task";

export type PublicTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
};

export type TaskListResponseDto = {
  tasks: PublicTaskDto[];
};

export type CreateTaskRequestDto = {
  title: string;
  description: string | null;
  dueDate: Date | null;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type UpdateTaskRequestDto = {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type ListTasksQueryDto = {
  status?: TaskStatus;
  priority?: TaskPriority;
};

export function toPublicTaskDto(task: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdAt: Date;
}): PublicTaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate === null ? null : formatCalendarDate(task.dueDate),
    createdAt: task.createdAt.toISOString(),
  };
}
