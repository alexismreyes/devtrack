import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import type { ChecklistsController } from "../controller/checklists-controller";
import {
  validateChecklistItemParams,
  validateChecklistParams,
  validateTaskIdForChecklistsParam,
} from "../validators/checklist-params";
import { validateCreateChecklistBody } from "../validators/create-checklist";
import { validateCreateChecklistItemBody } from "../validators/create-checklist-item";
import { validateEmptyTaskActionBody } from "../validators/empty-body";
import { validateUpdateChecklistBody } from "../validators/update-checklist";
import { validateUpdateChecklistItemBody } from "../validators/update-checklist-item";

export function createChecklistsRouter(
  controller: ChecklistsController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/api/tasks/:taskId/checklists",
    requireAuth,
    validateTaskIdForChecklistsParam,
    asyncHandler(async (req, res) => {
      await controller.list(req, res);
    }),
  );

  router.post(
    "/api/tasks/:taskId/checklists",
    requireAuth,
    validateTaskIdForChecklistsParam,
    validateCreateChecklistBody,
    asyncHandler(async (req, res) => {
      await controller.create(req, res);
    }),
  );

  router.patch(
    "/api/tasks/:taskId/checklists/:checklistId",
    requireAuth,
    validateChecklistParams,
    validateUpdateChecklistBody,
    asyncHandler(async (req, res) => {
      await controller.update(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:taskId/checklists/:checklistId",
    requireAuth,
    validateChecklistParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.delete(req, res);
    }),
  );

  router.post(
    "/api/tasks/:taskId/checklists/:checklistId/items",
    requireAuth,
    validateChecklistParams,
    validateCreateChecklistItemBody,
    asyncHandler(async (req, res) => {
      await controller.createItem(req, res);
    }),
  );

  router.patch(
    "/api/tasks/:taskId/checklists/:checklistId/items/:itemId",
    requireAuth,
    validateChecklistItemParams,
    validateUpdateChecklistItemBody,
    asyncHandler(async (req, res) => {
      await controller.updateItem(req, res);
    }),
  );

  router.delete(
    "/api/tasks/:taskId/checklists/:checklistId/items/:itemId",
    requireAuth,
    validateChecklistItemParams,
    validateEmptyTaskActionBody,
    asyncHandler(async (req, res) => {
      await controller.deleteItem(req, res);
    }),
  );

  return router;
}
