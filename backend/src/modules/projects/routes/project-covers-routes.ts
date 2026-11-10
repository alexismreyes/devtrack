import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import { createSingleFileMultipartMiddleware } from "../../../infrastructure/http/parse-single-file-multipart";
import type { ProjectCoversController } from "../controller/project-covers-controller";
import { PROJECT_COVER_MAX_SIZE_BYTES } from "../domain/project-cover";
import { validateEmptyProjectActionBody } from "../validators/empty-body";
import { validateProjectIdForCoverParam } from "../validators/project-cover-params";

const singleFileUpload = createSingleFileMultipartMiddleware({
  fieldName: "file",
  maxBytes: PROJECT_COVER_MAX_SIZE_BYTES,
});

export function createProjectCoversRouter(
  controller: ProjectCoversController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.put(
    "/api/projects/:projectId/cover",
    requireAuth,
    validateProjectIdForCoverParam,
    singleFileUpload,
    asyncHandler(async (req, res) => {
      await controller.upload(req, res);
    }),
  );

  router.get(
    "/api/projects/:projectId/cover/content",
    requireAuth,
    validateProjectIdForCoverParam,
    asyncHandler(async (req, res) => {
      await controller.content(req, res);
    }),
  );

  router.delete(
    "/api/projects/:projectId/cover",
    requireAuth,
    validateProjectIdForCoverParam,
    validateEmptyProjectActionBody,
    asyncHandler(async (req, res) => {
      await controller.clear(req, res);
    }),
  );

  return router;
}
