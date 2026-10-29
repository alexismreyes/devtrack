import { randomUUID } from "node:crypto";
import {
  InvalidTaskDueDateError,
  InvalidTaskPriorityError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const DEFAULT_TASK_STATUS: TaskStatus = "TODO";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const DEFAULT_TASK_PRIORITY: TaskPriority = "MEDIUM";

export type TaskDetailsChange = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
};

export function parseTaskStatus(value: string): TaskStatus {
  if ((TASK_STATUSES as readonly string[]).includes(value)) {
    return value as TaskStatus;
  }
  throw new InvalidTaskStatusError();
}

export function parseTaskPriority(value: string): TaskPriority {
  if ((TASK_PRIORITIES as readonly string[]).includes(value)) {
    return value as TaskPriority;
  }
  throw new InvalidTaskPriorityError();
}

export function calendarDateFromString(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidTaskDueDateError();
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new InvalidTaskDueDateError();
  }
  return parsed;
}

export function formatCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeTitle(title: string): string {
  const normalized = title.trim();
  if (normalized === "") {
    throw new InvalidTaskTitleError();
  }
  return normalized;
}

function normalizeDescription(
  description: string | null | undefined,
): string | null {
  if (description === undefined || description === null) {
    return null;
  }
  const normalized = description.trim();
  return normalized === "" ? null : normalized;
}

function normalizeDueDate(dueDate: Date | null | undefined): Date | null {
  if (dueDate === undefined || dueDate === null) {
    return null;
  }
  if (Number.isNaN(dueDate.getTime())) {
    throw new InvalidTaskDueDateError();
  }
  return new Date(
    Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
    ),
  );
}

export class Task {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate: Date | null;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;

  private constructor(
    id: string,
    projectId: string,
    title: string,
    description: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueDate: Date | null,
    createdAt: Date,
    deletedAt: Date | null,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Task id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("Task project id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Task created time must be a valid date");
    }
    if (deletedAt !== null && Number.isNaN(deletedAt.getTime())) {
      throw new Error("Task deleted time must be a valid date");
    }

    this.id = id;
    this.projectId = projectId;
    this.title = title;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.dueDate = dueDate === null ? null : new Date(dueDate.getTime());
    this.createdAt = new Date(createdAt.getTime());
    this.deletedAt =
      deletedAt === null ? null : new Date(deletedAt.getTime());
    Object.freeze(this);
  }

  static create(
    projectId: string,
    title: string,
    description: string | null | undefined = null,
    status: TaskStatus | undefined = undefined,
    priority: TaskPriority | undefined = undefined,
    dueDate: Date | null | undefined = null,
    now: Date = new Date(),
  ): Task {
    return new Task(
      randomUUID(),
      projectId,
      normalizeTitle(title),
      normalizeDescription(description),
      status === undefined ? DEFAULT_TASK_STATUS : parseTaskStatus(status),
      priority === undefined
        ? DEFAULT_TASK_PRIORITY
        : parseTaskPriority(priority),
      normalizeDueDate(dueDate),
      now,
      null,
    );
  }

  static rehydrate(
    id: string,
    projectId: string,
    title: string,
    description: string | null,
    status: string,
    priority: string,
    dueDate: Date | null,
    createdAt: Date,
    deletedAt: Date | null,
  ): Task {
    return new Task(
      id,
      projectId,
      normalizeTitle(title),
      normalizeDescription(description),
      parseTaskStatus(status),
      parseTaskPriority(priority),
      normalizeDueDate(dueDate),
      createdAt,
      deletedAt,
    );
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  withDetails(change: TaskDetailsChange): Task {
    return new Task(
      this.id,
      this.projectId,
      change.title !== undefined ? normalizeTitle(change.title) : this.title,
      change.description !== undefined
        ? normalizeDescription(change.description)
        : this.description,
      change.status !== undefined
        ? parseTaskStatus(change.status)
        : this.status,
      change.priority !== undefined
        ? parseTaskPriority(change.priority)
        : this.priority,
      change.dueDate !== undefined
        ? normalizeDueDate(change.dueDate)
        : this.dueDate,
      this.createdAt,
      this.deletedAt,
    );
  }

  softDelete(now: Date = new Date()): Task {
    if (this.deletedAt !== null) {
      return this;
    }

    return new Task(
      this.id,
      this.projectId,
      this.title,
      this.description,
      this.status,
      this.priority,
      this.dueDate,
      this.createdAt,
      now,
    );
  }
}
