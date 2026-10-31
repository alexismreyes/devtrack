import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { ProjectMembersController } from "../controller/project-members-controller";
import { validateAddMemberBody } from "../validators/add-member";
import { validateEmptyMemberActionBody } from "../validators/empty-body";
import { validateMemberItemParams } from "../validators/member-user-id";
import { validateMemberProjectIdParam } from "../validators/project-id";
import { validateUpdateMemberBody } from "../validators/update-member";

export function createProjectMembersRouter(
  controller: ProjectMembersController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/projects/:projectId/members",
    requireAuth,
    validateMemberProjectIdParam,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.post(
    "/api/projects/:projectId/members",
    requireAuth,
    validateMemberProjectIdParam,
    validateAddMemberBody,
    asyncHandler(async (req, res) => {
      await controller.add(req, res);
    }),
  );

  router.patch(
    "/api/projects/:projectId/members/:userId",
    requireAuth,
    validateMemberItemParams,
    validateUpdateMemberBody,
    asyncHandler(async (req, res) => {
      await controller.updateRole(req, res);
    }),
  );

  router.delete(
    "/api/projects/:projectId/members/:userId",
    requireAuth,
    validateMemberItemParams,
    validateEmptyMemberActionBody,
    asyncHandler(async (req, res) => {
      await controller.remove(req, res);
    }),
  );

  return router;
}
