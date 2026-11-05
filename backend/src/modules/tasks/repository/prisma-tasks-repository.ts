import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import { DatabaseUnavailableError, TaskNotFoundError } from "../domain/errors";
import { parseTaskPriority, parseTaskStatus, Task } from "../domain/task";
import type {
  CreateTaskInput,
  ListTasksFilters,
  TasksRepository,
  UpdateTaskInput,
} from "./tasks-repository";

const TASK_SELECT = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  deletedAt: true,
} as const;

const CONNECTION_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1009",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (
      CONNECTION_CODES.has(code) ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
  }
  return false;
}

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof TaskNotFoundError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toTask(row: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}): Task {
  return Task.rehydrate(
    row.id,
    row.projectId,
    row.title,
    row.description,
    parseTaskStatus(row.status),
    parseTaskPriority(row.priority),
    row.dueDate,
    row.createdAt,
    row.deletedAt,
  );
}

export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const task = Task.create(
      input.projectId,
      input.title,
      input.description,
      input.status,
      input.priority,
      input.dueDate,
    );
    try {
      const row = await this.client().task.create({
        data: {
          id: task.id,
          projectId: task.projectId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          deletedAt: task.deletedAt,
        },
        select: TASK_SELECT,
      });
      return toTask(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const row = await this.client().task.findUnique({
        where: { id },
        select: TASK_SELECT,
      });
      return row === null ? null : toTask(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByProjectId(
    projectId: string,
    filters: ListTasksFilters = {},
  ): Promise<Task[]> {
    try {
      const rows = await this.client().task.findMany({
        where: {
          projectId,
          deletedAt: null,
          ...(filters.status !== undefined ? { status: filters.status } : {}),
          ...(filters.priority !== undefined
            ? { priority: filters.priority }
            : {}),
          ...(filters.labelId !== undefined
            ? {
                taskLabels: {
                  some: { labelId: filters.labelId },
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        select: TASK_SELECT,
      });
      return rows.map(toTask);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]> {
    if (projectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().task.findMany({
        where: {
          projectId: { in: projectIds },
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: TASK_SELECT,
      });
      return rows.map(toTask);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const updated = existing.withDetails(input);
    try {
      const row = await this.client().task.update({
        where: { id },
        data: {
          title: updated.title,
          description: updated.description,
          status: updated.status,
          priority: updated.priority,
          dueDate: updated.dueDate,
        },
        select: TASK_SELECT,
      });
      return toTask(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async softDelete(id: string): Promise<Task> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    const deleted = existing.softDelete();
    try {
      const row = await this.client().task.update({
        where: { id },
        data: { deletedAt: deleted.deletedAt },
        select: TASK_SELECT,
      });
      return toTask(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
