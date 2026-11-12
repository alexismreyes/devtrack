import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { ProjectsController } from "../controller/projects-controller";
import { validateCreateProjectBody } from "../validators/create-project";
import { validateEmptyProjectActionBody } from "../validators/empty-body";
import { validateListProjectsQuery } from "../validators/list-projects-query";
import { validateProjectIdParam } from "../validators/project-id";
import { validateUpdateProjectBody } from "../validators/update-project";

export function createProjectsRouter(
  controller: ProjectsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/api/projects",
    requireAuth,
    validateCreateProjectBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.get(
    "/api/projects",
    requireAuth,
    validateListProjectsQuery,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.get(
    "/api/projects/:id",
    requireAuth,
    validateProjectIdParam,
    asyncHandler(async (req, res) => {
      await controller.getById(req, res);
    }),
  );

  router.patch(
    "/api/projects/:id",
    requireAuth,
    validateProjectIdParam,
    validateUpdateProjectBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.post(
    "/api/projects/:id/archive",
    requireAuth,
    validateProjectIdParam,
    validateEmptyProjectActionBody,
    asyncHandler(async (req, res) => {
      await controller.archive(req, res);
    }),
  );

  router.post(
    "/api/projects/:id/unarchive",
    requireAuth,
    validateProjectIdParam,
    validateEmptyProjectActionBody,
    asyncHandler(async (req, res) => {
      await controller.unarchive(req, res);
    }),
  );

  return router;
}
