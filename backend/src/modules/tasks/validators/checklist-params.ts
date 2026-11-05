import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const taskIdForChecklistsParamSchema = z
  .object({
    taskId: z.uuid(),
  })
  .strict();

export const checklistItemParamsSchema = z
  .object({
    taskId: z.uuid(),
    checklistId: z.uuid(),
  })
  .strict();

export const checklistItemNestedParamsSchema = z
  .object({
    taskId: z.uuid(),
    checklistId: z.uuid(),
    itemId: z.uuid(),
  })
  .strict();

export function validateTaskIdForChecklistsParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = taskIdForChecklistsParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}

export function validateChecklistParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = checklistItemParamsSchema.safeParse(req.params);
  if (!result.success) {
    if (
      typeof req.params.taskId === "string" &&
      !z.uuid().safeParse(req.params.taskId).success
    ) {
      next(validationError("Invalid task id"));
      return;
    }
    next(validationError("Invalid checklist id"));
    return;
  }
  next();
}

export function validateChecklistItemParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = checklistItemNestedParamsSchema.safeParse(req.params);
  if (!result.success) {
    if (
      typeof req.params.taskId === "string" &&
      !z.uuid().safeParse(req.params.taskId).success
    ) {
      next(validationError("Invalid task id"));
      return;
    }
    if (
      typeof req.params.checklistId === "string" &&
      !z.uuid().safeParse(req.params.checklistId).success
    ) {
      next(validationError("Invalid checklist id"));
      return;
    }
    next(validationError("Invalid checklist item id"));
    return;
  }
  next();
}
