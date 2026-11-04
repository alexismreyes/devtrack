import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UsersIdentityPort } from "../../users/identity/users-identity-port";
import {
  CommentForbiddenError,
  CommentNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import type { TaskComment } from "../domain/task-comment";
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

export class CommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly identities: UsersIdentityPort,
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
    const comment = await this.comments.create({
      taskId: task.id,
      authorUserId: actorId,
      body,
    });
    return this.toView(comment);
  }

  async listByTask(actorId: string, taskId: string): Promise<CommentView[]> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const comments = await this.comments.listByTaskId(task.id);
    const views: CommentView[] = [];
    for (const comment of comments) {
      views.push(await this.toView(comment));
    }
    return views;
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
