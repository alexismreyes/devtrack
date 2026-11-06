import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import { createSingleFileMultipartMiddleware } from "../../../infrastructure/http/parse-single-file-multipart";
import type { AttachmentsController } from "../controller/attachments-controller";
import { ATTACHMENT_MAX_SIZE_BYTES } from "../domain/task-attachment";
import {
  validateAttachmentParams,
  validateTaskIdForAttachmentsParam,
} from "../validators/attachment-params";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import { validateSetCoverBody } from "../validators/set-cover";

const singleFileUpload = createSingleFileMultipartMiddleware({
  fieldName: "file",
  maxBytes: ATTACHMENT_MAX_SIZE_BYTES,
});

export function createAttachmentsRouter(
  controller: AttachmentsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/tasks/:taskId/attachments",
    requireAuth,
    validateTaskIdForAttachmentsParam,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.post(
    "/api/tasks/:taskId/attachments",
    requireAuth,
    validateTaskIdForAttachmentsParam,
    singleFileUpload,
    asyncHandler(async (req, res) => {
      await controller.upload(req, res);
    }),
  );

  router.get(
    "/api/tasks/:taskId/attachments/:attachmentId",
    requireAuth,
    validateAttachmentParams,
    asyncHandler(async (req, res) => {
      await controller.get(req, res);
    }),
  );

  router.get(
    "/api/tasks/:taskId/attachments/:attachmentId/content",
    requireAuth,
    validateAttachmentParams,
    asyncHandler(async (req, res) => {
      await controller.content(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:taskId/attachments/:attachmentId",
    requireAuth,
    validateAttachmentParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.delete(req, res);
    }),
  );

  router.put(
    "/api/tasks/:taskId/cover",
    requireAuth,
    validateTaskIdForAttachmentsParam,
    validateSetCoverBody,
    asyncHandler(async (req, res) => {
      await controller.setCover(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:taskId/cover",
    requireAuth,
    validateTaskIdForAttachmentsParam,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.clearCover(req, res);
    }),
  );

  return router;
}
