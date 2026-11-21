import { takeNewestPage } from "../domain/feed-cursor";
import { CommentNotFoundError } from "../domain/errors";
import { TaskComment } from "../domain/task-comment";
import type {
  CommentsPageResult,
  CommentsRepository,
  CreateCommentInput,
  ListCommentsPageInput,
} from "../repository/comments-repository";

export class InMemoryCommentsRepository implements CommentsRepository {
  readonly commentsById = new Map<string, TaskComment>();

  async create(input: CreateCommentInput): Promise<TaskComment> {
    const comment = TaskComment.create(
      input.taskId,
      input.authorUserId,
      input.body,
    );
    this.commentsById.set(comment.id, comment);
    return comment;
  }

  async findById(id: string): Promise<TaskComment | null> {
    return this.commentsById.get(id) ?? null;
  }

  async listPage(input: ListCommentsPageInput): Promise<CommentsPageResult> {
    const live = [...this.commentsById.values()].filter(
      (comment) =>
        comment.taskId === input.taskId && comment.deletedAt === null,
    );
    return takeNewestPage(live, input.limit, input.cursor);
  }

  async updateBody(id: string, body: string): Promise<TaskComment> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new CommentNotFoundError();
    }
    const updated = existing.withBody(body);
    this.commentsById.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<TaskComment> {
    const existing = await this.findById(id);
    if (existing === null || existing.deletedAt !== null) {
      throw new CommentNotFoundError();
    }
    const deleted = existing.softDelete();
    this.commentsById.set(id, deleted);
    return deleted;
  }
}
