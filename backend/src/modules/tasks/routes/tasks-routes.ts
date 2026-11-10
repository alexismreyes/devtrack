import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { TasksController } from "../controller/tasks-controller";
import { validateCreateTaskBody } from "../validators/create-task";
import { validateDashboardQuery } from "../validators/dashboard-query";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import { validateListTasksQuery } from "../validators/list-tasks-query";
import { validateTaskProjectIdParam } from "../validators/project-id";
import { validateReorderTasksBody } from "../validators/reorder-tasks";
import { validateTaskIdParam } from "../validators/task-id";
import { validateUpdateTaskBody } from "../validators/update-task";

export function createTasksRouter(
  controller: TasksController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/dashboard",
    requireAuth,
    validateDashboardQuery,
    asyncHandler(async (req, res) => {
      await controller.getDashboard(req, res);
    }),
  );

  router.post(
    "/api/projects/:projectId/tasks",
    requireAuth,
    validateTaskProjectIdParam,
    validateCreateTaskBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.get(
    "/api/projects/:projectId/tasks",
    requireAuth,
    validateTaskProjectIdParam,
    validateListTasksQuery,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.put(
    "/api/projects/:projectId/tasks/reorder",
    requireAuth,
    validateTaskProjectIdParam,
    validateReorderTasksBody,
    asyncHandler(async (req, res) => {
      await controller.reorder(req, res);
    }),
  );

  router.get(
    "/api/tasks/:id",
    requireAuth,
    validateTaskIdParam,
    asyncHandler(async (req, res) => {
      await controller.getById(req, res);
    }),
  );

  router.patch(
    "/api/tasks/:id",
    requireAuth,
    validateTaskIdParam,
    validateUpdateTaskBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:id",
    requireAuth,
    validateTaskIdParam,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.softDelete(req, res);
    }),
  );

  return router;
}
