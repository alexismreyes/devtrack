import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const taskIdForAttachmentsParamSchema = z
  .object({
    taskId: z.uuid(),
  })
  .strict();

export const attachmentParamsSchema = z
  .object({
    taskId: z.uuid(),
    attachmentId: z.uuid(),
  })
  .strict();

export function validateTaskIdForAttachmentsParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = taskIdForAttachmentsParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}

export function validateAttachmentParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = attachmentParamsSchema.safeParse(req.params);
  if (!result.success) {
    if (
      typeof req.params.taskId === "string" &&
      !z.uuid().safeParse(req.params.taskId).success
    ) {
      next(validationError("Invalid task id"));
      return;
    }
    next(validationError("Invalid attachment id"));
    return;
  }
  next();
}
