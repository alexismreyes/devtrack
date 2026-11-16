import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { ReorderTasksRequestDto } from "../dto/task-dtos";

export const reorderTasksBodySchema = z
  .object({
    status: z.string().trim().min(1).max(64),
    taskIds: z.array(z.uuid()),
  })
  .strict()
  .transform(
    (data): ReorderTasksRequestDto => ({
      status: data.status,
      taskIds: data.taskIds,
    }),
  );

export function validateReorderTasksBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = reorderTasksBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
