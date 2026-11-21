import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { ActivityController } from "../controller/activity-controller";
import { validateActivityTaskIdParam } from "../validators/activity-params";
import { validateFeedPaginationQuery } from "../validators/feed-pagination-query";

export function createActivityRouter(
  controller: ActivityController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/tasks/:taskId/activity",
    requireAuth,
    validateActivityTaskIdParam,
    validateFeedPaginationQuery,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  return router;
}
