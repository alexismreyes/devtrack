import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const statusProjectIdParamSchema = z
  .object({
    projectId: z.uuid(),
  })
  .strict();

export const statusItemParamsSchema = z
  .object({
    projectId: z.uuid(),
    statusId: z.uuid(),
  })
  .strict();

export function validateStatusProjectIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = statusProjectIdParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid project id"));
    return;
  }
  next();
}

export function validateStatusItemParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = statusItemParamsSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid status parameters"));
    return;
  }
  next();
}
