import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  CommentNotFoundError,
  DatabaseUnavailableError,
} from "../domain/errors";
import { TaskComment } from "../domain/task-comment";
import type {
  CommentsRepository,
  CreateCommentInput,
} from "./comments-repository";

const COMMENT_SELECT = {
  id: true,
  taskId: true,
  authorUserId: true,
  body: true,
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
    err instanceof CommentNotFoundError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toComment(row: {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
}): TaskComment {
  return TaskComment.rehydrate(
    row.id,
    row.taskId,
    row.authorUserId,
    row.body,
    row.createdAt,
    row.deletedAt,
  );
}

export class PrismaCommentsRepository implements CommentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCommentInput): Promise<TaskComment> {
    const comment = TaskComment.create(
      input.taskId,
      input.authorUserId,
      input.body,
    );
    try {
      const row = await this.prisma.taskComment.create({
        data: {
          id: comment.id,
          taskId: comment.taskId,
          authorUserId: comment.authorUserId,
          body: comment.body,
          createdAt: comment.createdAt,
          deletedAt: comment.deletedAt,
        },
        select: COMMENT_SELECT,
      });
      return toComment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findById(id: string): Promise<TaskComment | null> {
    try {
      const row = await this.prisma.taskComment.findUnique({
        where: { id },
        select: COMMENT_SELECT,
      });
      return row === null ? null : toComment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByTaskId(taskId: string): Promise<TaskComment[]> {
    try {
      const rows = await this.prisma.taskComment.findMany({
        where: {
          taskId,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        select: COMMENT_SELECT,
      });
      return rows.map(toComment);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async updateBody(id: string, body: string): Promise<TaskComment> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new CommentNotFoundError();
    }
    const updated = existing.withBody(body);
    try {
      const row = await this.prisma.taskComment.update({
        where: { id },
        data: { body: updated.body },
        select: COMMENT_SELECT,
      });
      return toComment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async softDelete(id: string): Promise<TaskComment> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new CommentNotFoundError();
    }
    const deleted = existing.softDelete();
    try {
      const row = await this.prisma.taskComment.update({
        where: { id },
        data: { deletedAt: deleted.deletedAt },
        select: COMMENT_SELECT,
      });
      return toComment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
