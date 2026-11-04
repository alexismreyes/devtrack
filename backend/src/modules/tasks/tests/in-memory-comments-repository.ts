import { CommentNotFoundError } from "../domain/errors";
import { TaskComment } from "../domain/task-comment";
import type {
  CommentsRepository,
  CreateCommentInput,
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

  async listByTaskId(taskId: string): Promise<TaskComment[]> {
    return [...this.commentsById.values()]
      .filter(
        (comment) => comment.taskId === taskId && comment.deletedAt === null,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
