import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { TASK_PRIORITIES } from "../domain/task";

export const listTasksQuerySchema = z
  .object({
    status: z.string().trim().min(1).max(64).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    labelId: z.uuid().optional(),
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
