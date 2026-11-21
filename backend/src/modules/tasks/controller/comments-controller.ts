import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicCommentDto,
  type CommentListResponseDto,
  type CreateCommentRequestDto,
  type UpdateCommentRequestDto,
} from "../dto/comment-dtos";
import type { CommentsService } from "../service/comments-service";
import { readFeedPaginationQuery } from "../validators/feed-pagination-query";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireTaskId(req: Request): string {
  const taskId = req.params.taskId;
  if (typeof taskId !== "string") {
    throw validationError("Invalid task id");
  }
  return taskId;
}

function requireCommentId(req: Request): string {
  const commentId = req.params.commentId;
  if (typeof commentId !== "string") {
    throw validationError("Invalid comment id");
  }
  return commentId;
}

export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateCommentRequestDto;
    const comment = await this.service.create(
      actorId,
      requireTaskId(req),
      body.body,
    );
    res.status(201).json(toPublicCommentDto(comment));
  }

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const query = readFeedPaginationQuery(req);
    const page = await this.service.listByTask(actorId, requireTaskId(req), {
      cursor: query.cursor,
      limit: query.limit,
    });
    const body: CommentListResponseDto = {
      comments: page.comments.map(toPublicCommentDto),
      nextCursor: page.nextCursor,
    };
    res.status(200).json(body);
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateCommentRequestDto;
    const comment = await this.service.updateBody(
      actorId,
      requireTaskId(req),
      requireCommentId(req),
      body.body,
    );
    res.status(200).json(toPublicCommentDto(comment));
  }

  async softDelete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.softDelete(
      actorId,
      requireTaskId(req),
      requireCommentId(req),
    );
    res.status(204).send();
  }
}
