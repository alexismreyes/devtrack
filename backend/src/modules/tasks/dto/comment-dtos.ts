import type { CommentView } from "../service/comments-service";

export type PublicCommentDto = {
  id: string;
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  createdAt: string;
};

export type CommentListResponseDto = {
  comments: PublicCommentDto[];
  nextCursor: string | null;
};

export type CreateCommentRequestDto = {
  body: string;
};

export type UpdateCommentRequestDto = {
  body: string;
};

export function toPublicCommentDto(comment: CommentView): PublicCommentDto {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorUserId: comment.authorUserId,
    authorDisplayName: comment.authorDisplayName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}
