import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { UsersController } from "../controller/users-controller";
import { validateUpdateProfileBody } from "../validators/update-profile";

export function createUsersRouter(
  controller: UsersController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/users/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      await controller.getMe(req, res);
    }),
  );

  router.patch(
    "/api/users/me",
    requireAuth,
    validateUpdateProfileBody,
    asyncHandler(async (req, res) => {
      await controller.updateMe(req, res);
    }),
  );

  return router;
}
