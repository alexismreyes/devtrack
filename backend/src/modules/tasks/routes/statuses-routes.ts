import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { StatusesController } from "../controller/statuses-controller";
import { validateCreateStatusBody } from "../validators/create-status";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import { validateReorderStatusesBody } from "../validators/reorder-statuses";
import {
  validateStatusItemParams,
  validateStatusProjectIdParam,
} from "../validators/status-params";
import { validateUpdateStatusBody } from "../validators/update-status";

export function createStatusesRouter(
  controller: StatusesController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/projects/:projectId/statuses",
    requireAuth,
    validateStatusProjectIdParam,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.post(
    "/api/projects/:projectId/statuses",
    requireAuth,
    validateStatusProjectIdParam,
    validateCreateStatusBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.put(
    "/api/projects/:projectId/statuses/reorder",
    requireAuth,
    validateStatusProjectIdParam,
    validateReorderStatusesBody,
    asyncHandler(async (req, res) => {
      await controller.reorder(req, res);
    }),
  );

  router.patch(
    "/api/projects/:projectId/statuses/:statusId",
    requireAuth,
    validateStatusItemParams,
    validateUpdateStatusBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.delete(
    "/api/projects/:projectId/statuses/:statusId",
    requireAuth,
    validateStatusItemParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.delete(req, res);
    }),
  );

  return router;
}
