import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const labelProjectIdParamSchema = z
  .object({
    projectId: z.uuid(),
  })
  .strict();

export const labelItemParamsSchema = z
  .object({
    projectId: z.uuid(),
    labelId: z.uuid(),
  })
  .strict();

export const taskIdForLabelsParamSchema = z
  .object({
    taskId: z.uuid(),
  })
  .strict();

export function validateLabelProjectIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = labelProjectIdParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid project id"));
    return;
  }
  next();
}

export function validateLabelItemParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = labelItemParamsSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid label parameters"));
    return;
  }
  next();
}

export function validateTaskIdForLabelsParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = taskIdForLabelsParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}
