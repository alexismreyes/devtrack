import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UnitOfWork } from "../../projects/access/unit-of-work";
import type { UsersIdentityPort } from "../../users/identity/users-identity-port";
import { validationError } from "../../../infrastructure/http/app-error";
import {
  CommentForbiddenError,
  CommentNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import {
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  decodeFeedCursor,
  encodeFeedCursor,
} from "../domain/feed-cursor";
import type { TaskComment } from "../domain/task-comment";
import { TaskActivityEvent } from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import type { CommentsRepository } from "../repository/comments-repository";
import type { TasksRepository } from "../repository/tasks-repository";

export type CommentView = {
  id: string;
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
};

export type CommentListPage = {
  comments: CommentView[];
  nextCursor: string | null;
};

export type ListCommentsOptions = {
  cursor?: string;
  limit?: number;
};

export class CommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly identities: UsersIdentityPort,
    private readonly activity: ActivityRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(
    actorId: string,
    taskId: string,
    body: string,
  ): Promise<CommentView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    return this.unitOfWork.run(async () => {
      const comment = await this.comments.create({
        taskId: task.id,
        authorUserId: actorId,
        body,
      });
      await this.activity.create(
        TaskActivityEvent.commentAdded(
          task.id,
          actorId,
          comment.id,
          comment.body,
        ),
      );
      return this.toView(comment);
    });
  }

  async listByTask(
    actorId: string,
    taskId: string,
    options: ListCommentsOptions = {},
  ): Promise<CommentListPage> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const limit = normalizeFeedLimit(options.limit);
    const cursor =
      options.cursor === undefined ? null : parseFeedCursor(options.cursor);
    const page = await this.comments.listPage({
      taskId: task.id,
      limit,
      cursor,
    });
    const views: CommentView[] = [];
    for (const comment of page.items) {
      views.push(await this.toView(comment));
    }
    return {
      comments: views,
      nextCursor:
        page.nextCursor === null ? null : encodeFeedCursor(page.nextCursor),
    };
  }

  async updateBody(
    actorId: string,
    taskId: string,
    commentId: string,
    body: string,
  ): Promise<CommentView> {
    const task = await this.requireLiveTask(taskId);
    const comment = await this.requireLiveComment(commentId, task.id);
    if (!comment.isAuthoredBy(actorId)) {
      throw new CommentForbiddenError();
    }
    const snapshot = await this.authorization.requireTaskRead(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const updated = await this.comments.updateBody(comment.id, body);
    return this.toView(updated);
  }

  async softDelete(
    actorId: string,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    const task = await this.requireLiveTask(taskId);
    const comment = await this.requireLiveComment(commentId, task.id);
    const isAuthor = comment.isAuthoredBy(actorId);
    if (isAuthor) {
      const snapshot = await this.authorization.requireTaskRead(
        actorId,
        task.projectId,
      );
      this.assertParentWritable(snapshot.archivedAt);
    } else {
      const snapshot = await this.authorization.requireProjectOwner(
        actorId,
        task.projectId,
      );
      this.assertParentWritable(snapshot.archivedAt);
    }
    await this.comments.softDelete(comment.id);
  }

  private async requireLiveTask(taskId: string) {
    const task = await this.tasks.findById(taskId);
    if (task === null || task.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    return task;
  }

  private async requireLiveComment(
    commentId: string,
    taskId: string,
  ): Promise<TaskComment> {
    const comment = await this.comments.findById(commentId);
    if (
      comment === null ||
      comment.deletedAt !== null ||
      comment.taskId !== taskId
    ) {
      throw new CommentNotFoundError();
    }
    return comment;
  }

  private assertParentWritable(archivedAt: Date | null): void {
    if (archivedAt !== null) {
      throw new TaskParentArchivedError();
    }
  }

  private async toView(comment: TaskComment): Promise<CommentView> {
    const identity = await this.identities.findById(comment.authorUserId);
    return {
      id: comment.id,
      taskId: comment.taskId,
      authorUserId: comment.authorUserId,
      authorDisplayName: identity?.displayName ?? "Unknown",
      body: comment.body,
      createdAt: comment.createdAt,
    };
  }
}

function normalizeFeedLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_FEED_LIMIT;
  }
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_FEED_LIMIT
  ) {
    throw validationError("Invalid request query");
  }
  return limit;
}

function parseFeedCursor(token: string) {
  try {
    return decodeFeedCursor(token);
  } catch {
    throw validationError("Invalid request query");
  }
}
