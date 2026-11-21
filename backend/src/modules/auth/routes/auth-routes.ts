import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { AuthController } from "../controller/auth-controller";
import { validateChangePasswordBody } from "../validators/change-password";
import { validateLoginBody } from "../validators/login";
import { validateRegisterBody } from "../validators/register";

export function createAuthRouter(
  controller: AuthController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/api/auth/register",
    validateRegisterBody,
    asyncHandler(async (req, res) => {
      await controller.register(req, res);
    }),
  );

  router.post(
    "/api/auth/login",
    validateLoginBody,
    asyncHandler(async (req, res) => {
      await controller.login(req, res);
    }),
  );

  router.post(
    "/api/auth/logout",
    requireAuth,
    asyncHandler(async (req, res) => {
      await controller.logout(req, res);
    }),
  );

  router.post(
    "/api/auth/password",
    requireAuth,
    validateChangePasswordBody,
    asyncHandler(async (req, res) => {
      await controller.changePassword(req, res);
    }),
  );

  return router;
}
