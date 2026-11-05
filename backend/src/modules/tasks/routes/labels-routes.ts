import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { LabelsController } from "../controller/labels-controller";
import { validateCreateLabelBody } from "../validators/create-label";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import {
  validateLabelItemParams,
  validateLabelProjectIdParam,
  validateTaskIdForLabelsParam,
} from "../validators/label-params";
import { validateReplaceTaskLabelsBody } from "../validators/replace-task-labels";
import { validateUpdateLabelBody } from "../validators/update-label";

export function createLabelsRouter(
  controller: LabelsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/projects/:projectId/labels",
    requireAuth,
    validateLabelProjectIdParam,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.post(
    "/api/projects/:projectId/labels",
    requireAuth,
    validateLabelProjectIdParam,
    validateCreateLabelBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.patch(
    "/api/projects/:projectId/labels/:labelId",
    requireAuth,
    validateLabelItemParams,
    validateUpdateLabelBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.delete(
    "/api/projects/:projectId/labels/:labelId",
    requireAuth,
    validateLabelItemParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.delete(req, res);
    }),
  );

  router.put(
    "/api/tasks/:taskId/labels",
    requireAuth,
    validateTaskIdForLabelsParam,
    validateReplaceTaskLabelsBody,
    asyncHandler(async (req, res) => {
      await controller.replaceTaskLabels(req, res);
    }),
  );

  return router;
}
