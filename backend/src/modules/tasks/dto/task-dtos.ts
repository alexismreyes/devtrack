import {
  formatCalendarDate,
  type TaskPriority,
  type TaskStatus,
} from "../domain/task";
import type { TaskView } from "../service/tasks-service";
import type { TaskEmbeddedLabelDto } from "./label-dtos";
import { toTaskEmbeddedLabelDto } from "./label-dtos";

export type PublicCoverSummaryDto = {
  attachmentId: string;
  contentType: string;
};

export type PublicTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  /** Catalog status key string (not enum). */
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  labels: TaskEmbeddedLabelDto[];
  /** Cover summary only — never a full attachments array (Q-140). */
  cover: PublicCoverSummaryDto | null;
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
  labelId?: string;
};

export function toPublicTaskDto(task: TaskView): PublicTaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate === null ? null : formatCalendarDate(task.dueDate),
    createdAt: task.createdAt.toISOString(),
    labels: task.labels.map(toTaskEmbeddedLabelDto),
    cover:
      task.cover === null
        ? null
        : {
            attachmentId: task.cover.attachmentId,
            contentType: task.cover.contentType,
          },
  };
}
