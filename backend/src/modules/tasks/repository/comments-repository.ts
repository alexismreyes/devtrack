import type { FeedCursor } from "../domain/feed-cursor";
import type { TaskComment } from "../domain/task-comment";

export type CreateCommentInput = {
  taskId: string;
  authorUserId: string;
  body: string;
};

export type ListCommentsPageInput = {
  taskId: string;
  limit: number;
  cursor: FeedCursor | null;
};

export type CommentsPageResult = {
  items: TaskComment[];
  nextCursor: FeedCursor | null;
};

export interface CommentsRepository {
  create(input: CreateCommentInput): Promise<TaskComment>;
  findById(id: string): Promise<TaskComment | null>;
  listPage(input: ListCommentsPageInput): Promise<CommentsPageResult>;
  updateBody(id: string, body: string): Promise<TaskComment>;
  softDelete(id: string): Promise<TaskComment>;
}
