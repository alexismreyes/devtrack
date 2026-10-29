import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { TASK_PRIORITIES, TASK_STATUSES } from "../domain/task";

export const listTasksQuerySchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
  })
  .strict();

export function validateListTasksQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = listTasksQuerySchema.safeParse(req.query);
  if (!result.success) {
    next(validationError("Invalid request query"));
    return;
  }
  next();
}
