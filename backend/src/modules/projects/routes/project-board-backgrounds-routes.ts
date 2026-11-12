import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import { createSingleFileMultipartMiddleware } from "../../../infrastructure/http/parse-single-file-multipart";
import type { ProjectBoardBackgroundsController } from "../controller/project-board-backgrounds-controller";
import { PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES } from "../domain/project-board-background";
import { validateEmptyProjectActionBody } from "../validators/empty-body";
import { validateProjectIdForBoardBackgroundParam } from "../validators/project-board-background-params";

const singleFileUpload = createSingleFileMultipartMiddleware({
  fieldName: "file",
  maxBytes: PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES,
});

export function createProjectBoardBackgroundsRouter(
  controller: ProjectBoardBackgroundsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.put(
    "/api/projects/:projectId/board-background",
    requireAuth,
    validateProjectIdForBoardBackgroundParam,
    singleFileUpload,
    asyncHandler(async (req, res) => {
      await controller.upload(req, res);
    }),
  );

  router.get(
    "/api/projects/:projectId/board-background/content",
    requireAuth,
    validateProjectIdForBoardBackgroundParam,
    asyncHandler(async (req, res) => {
      await controller.content(req, res);
    }),
  );

  router.delete(
    "/api/projects/:projectId/board-background",
    requireAuth,
    validateProjectIdForBoardBackgroundParam,
    validateEmptyProjectActionBody,
    asyncHandler(async (req, res) => {
      await controller.clear(req, res);
    }),
  );

  return router;
}
