import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  currentPrisma,
  type PrismaExecutor,
} from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  InvalidTaskReorderError,
  TaskNotFoundError,
} from "../domain/errors";
import {
  applyTaskReorder,
  densifyLiveTasks,
  nextTaskPosition,
  parseTaskPriority,
  parseTaskStatus,
  sortTasksByPositionAsc,
  Task,
  type TaskStatus,
} from "../domain/task";
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
  position: true,
  coverAttachmentId: true,
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
    err instanceof TaskNotFoundError ||
    err instanceof InvalidTaskReorderError
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
  position: number;
  coverAttachmentId: string | null;
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
    row.position,
    row.coverAttachmentId,
  );
}

type TxClient = Prisma.TransactionClient;

export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client(): PrismaExecutor {
    return currentPrisma(this.prisma);
  }

  /**
   * Join an ambient UnitOfWork transaction when present; otherwise open one.
   * Avoids nested $transaction that would escape ALS and split activity writes.
   */
  private async runInTransaction<T>(
    work: (tx: TxClient) => Promise<T>,
  ): Promise<T> {
    const executor = this.client();
    if (
      "$transaction" in executor &&
      typeof executor.$transaction === "function"
    ) {
      return executor.$transaction(work);
    }
    return work(executor as TxClient);
  }

  private async listLiveInStatus(
    client: PrismaExecutor,
    projectId: string,
    status: TaskStatus,
    excludeId?: string,
  ): Promise<Task[]> {
    const rows = await client.task.findMany({
      where: {
        projectId,
        status,
        deletedAt: null,
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: TASK_SELECT,
    });
    return rows.map(toTask);
  }

  private async writeDensePositions(
    tx: PrismaExecutor,
    tasks: readonly Task[],
  ): Promise<void> {
    if (tasks.length === 0) {
      return;
    }
    // Two-phase write avoids unique live (projectId, status, position) collisions.
    const offset = tasks.length + 1000;
    for (let i = 0; i < tasks.length; i += 1) {
      await tx.task.update({
        where: { id: tasks[i]!.id },
        data: { position: offset + i },
      });
    }
    for (const task of tasks) {
      await tx.task.update({
        where: { id: task.id },
        data: { position: task.position },
      });
    }
  }

  async create(input: CreateTaskInput): Promise<Task> {
    try {
      const row = await this.runInTransaction(async (tx) => {
        const status =
          input.status === undefined
            ? "TODO"
            : parseTaskStatus(input.status);
        const siblings = await this.listLiveInStatus(
          tx,
          input.projectId,
          status,
        );
        const position = nextTaskPosition(siblings);
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
        return tx.task.create({
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
            position: task.position,
          },
          select: TASK_SELECT,
        });
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
        orderBy: [{ position: "asc" }, { id: "asc" }],
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
        orderBy: [{ position: "asc" }, { id: "asc" }],
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
    const statusChanged =
      input.status !== undefined && input.status !== existing.status;
    const updated = existing.withDetails(input);

    try {
      if (!statusChanged) {
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
      }

      const row = await this.runInTransaction(async (tx) => {
        const sourceSiblings = densifyLiveTasks(
          await this.listLiveInStatus(
            tx,
            existing.projectId,
            existing.status,
            existing.id,
          ),
        );
        await this.writeDensePositions(tx, sourceSiblings);

        const targetSiblings = await this.listLiveInStatus(
          tx,
          existing.projectId,
          updated.status,
          existing.id,
        );
        const appended = updated.withPosition(nextTaskPosition(targetSiblings));

        return tx.task.update({
          where: { id },
          data: {
            title: appended.title,
            description: appended.description,
            status: appended.status,
            priority: appended.priority,
            dueDate: appended.dueDate,
            position: appended.position,
          },
          select: TASK_SELECT,
        });
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
      const row = await this.runInTransaction(async (tx) => {
        const softDeleted = await tx.task.update({
          where: { id },
          data: { deletedAt: deleted.deletedAt },
          select: TASK_SELECT,
        });
        const remaining = densifyLiveTasks(
          await this.listLiveInStatus(
            tx,
            existing.projectId,
            existing.status,
          ),
        );
        await this.writeDensePositions(tx, remaining);
        return softDeleted;
      });
      return toTask(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async reorderInStatus(
    projectId: string,
    status: TaskStatus,
    orderedIds: string[],
  ): Promise<Task[]> {
    try {
      return await this.runInTransaction(async (tx) => {
        const existing = await this.listLiveInStatus(tx, projectId, status);
        const reordered = applyTaskReorder(existing, orderedIds);
        await this.writeDensePositions(tx, reordered);
        return sortTasksByPositionAsc(reordered);
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
