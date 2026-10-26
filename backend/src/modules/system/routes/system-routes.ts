import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { SystemController } from "../controller/system-controller";
import { validateCreateProbeBody } from "../validators/create-probe";

export function createSystemRouter(
  controller: SystemController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get("/health", (req, res) => {
    controller.health(req, res);
  });

  router.get(
    "/ready",
    asyncHandler(async (req, res) => {
      await controller.ready(req, res);
    }),
  );

  router.post(
    "/api/system/probes",
    requireAuth,
    validateCreateProbeBody,
    asyncHandler(async (req, res) => {
      await controller.createProbe(req, res);
    }),
  );

  router.get(
    "/api/system/probes",
    requireAuth,
    asyncHandler(async (req, res) => {
      await controller.listProbes(req, res);
    }),
  );

  return router;
}
