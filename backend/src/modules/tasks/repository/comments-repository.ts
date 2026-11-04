import type { TaskComment } from "../domain/task-comment";

export type CreateCommentInput = {
  taskId: string;
  authorUserId: string;
  body: string;
};

export interface CommentsRepository {
  create(input: CreateCommentInput): Promise<TaskComment>;
  findById(id: string): Promise<TaskComment | null>;
  listByTaskId(taskId: string): Promise<TaskComment[]>;
  updateBody(id: string, body: string): Promise<TaskComment>;
  softDelete(id: string): Promise<TaskComment>;
}
