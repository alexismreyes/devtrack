import { randomUUID } from "node:crypto";
import { InvalidCommentBodyError } from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeBody(body: string): string {
  const normalized = body.trim();
  if (normalized === "") {
    throw new InvalidCommentBodyError();
  }
  return normalized;
}

export class TaskComment {
  readonly id: string;
  readonly taskId: string;
  readonly authorUserId: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;

  private constructor(
    id: string,
    taskId: string,
    authorUserId: string,
    body: string,
    createdAt: Date,
    deletedAt: Date | null,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Comment id must be a UUID");
    }
    if (!UUID_PATTERN.test(taskId)) {
      throw new Error("Comment task id must be a UUID");
    }
    if (!UUID_PATTERN.test(authorUserId)) {
      throw new Error("Comment author id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Comment created time must be a valid date");
    }
    if (deletedAt !== null && Number.isNaN(deletedAt.getTime())) {
      throw new Error("Comment deleted time must be a valid date");
    }

    this.id = id;
    this.taskId = taskId;
    this.authorUserId = authorUserId;
    this.body = body;
    this.createdAt = new Date(createdAt.getTime());
    this.deletedAt =
      deletedAt === null ? null : new Date(deletedAt.getTime());
    Object.freeze(this);
  }

  static create(
    taskId: string,
    authorUserId: string,
    body: string,
    now: Date = new Date(),
  ): TaskComment {
    return new TaskComment(
      randomUUID(),
      taskId,
      authorUserId,
      normalizeBody(body),
      now,
      null,
    );
  }

  static rehydrate(
    id: string,
    taskId: string,
    authorUserId: string,
    body: string,
    createdAt: Date,
    deletedAt: Date | null,
  ): TaskComment {
    return new TaskComment(
      id,
      taskId,
      authorUserId,
      normalizeBody(body),
      createdAt,
      deletedAt,
    );
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  isAuthoredBy(userId: string): boolean {
    return this.authorUserId === userId;
  }

  canBeEditedBy(actorId: string): boolean {
    return !this.isDeleted && this.isAuthoredBy(actorId);
  }

  canBeSoftDeletedBy(actorId: string, isEffectiveOwner: boolean): boolean {
    if (this.isDeleted) {
      return false;
    }
    return this.isAuthoredBy(actorId) || isEffectiveOwner;
  }

  withBody(body: string): TaskComment {
    return new TaskComment(
      this.id,
      this.taskId,
      this.authorUserId,
      normalizeBody(body),
      this.createdAt,
      this.deletedAt,
    );
  }

  softDelete(now: Date = new Date()): TaskComment {
    if (this.deletedAt !== null) {
      return this;
    }

    return new TaskComment(
      this.id,
      this.taskId,
      this.authorUserId,
      this.body,
      this.createdAt,
      now,
    );
  }
}

export function sortLiveCommentsOldestFirst(
  comments: readonly TaskComment[],
): TaskComment[] {
  return comments
    .filter((comment) => comment.deletedAt === null)
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
