import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const activityTaskIdParamSchema = z
  .object({
    taskId: z.uuid(),
  })
  .strict();

export function validateActivityTaskIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = activityTaskIdParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}
