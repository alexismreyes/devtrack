import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const taskIdForCommentsParamSchema = z
  .object({
    taskId: z.uuid(),
  })
  .strict();

export const commentItemParamsSchema = z
  .object({
    taskId: z.uuid(),
    commentId: z.uuid(),
  })
  .strict();

export function validateTaskIdForCommentsParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = taskIdForCommentsParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}

export function validateCommentItemParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = commentItemParamsSchema.safeParse(req.params);
  if (!result.success) {
    if (
      typeof req.params.taskId === "string" &&
      !z.uuid().safeParse(req.params.taskId).success
    ) {
      next(validationError("Invalid task id"));
      return;
    }
    next(validationError("Invalid comment id"));
    return;
  }
  next();
}
