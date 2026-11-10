import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { CommentsController } from "../controller/comments-controller";
import {
  validateCommentItemParams,
  validateTaskIdForCommentsParam,
} from "../validators/comment-params";
import { validateCreateCommentBody } from "../validators/create-comment";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import { validateFeedPaginationQuery } from "../validators/feed-pagination-query";
import { validateUpdateCommentBody } from "../validators/update-comment";

export function createCommentsRouter(
  controller: CommentsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/api/tasks/:taskId/comments",
    requireAuth,
    validateTaskIdForCommentsParam,
    validateCreateCommentBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.get(
    "/api/tasks/:taskId/comments",
    requireAuth,
    validateTaskIdForCommentsParam,
    validateFeedPaginationQuery,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.patch(
    "/api/tasks/:taskId/comments/:commentId",
    requireAuth,
    validateCommentItemParams,
    validateUpdateCommentBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:taskId/comments/:commentId",
    requireAuth,
    validateCommentItemParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.softDelete(req, res);
    }),
  );

  return router;
}
