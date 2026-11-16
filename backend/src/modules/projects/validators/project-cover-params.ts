import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const projectIdForCoverParamSchema = z
  .object({
    projectId: z.uuid(),
  })
  .strict();

export function validateProjectIdForCoverParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = projectIdForCoverParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid project id"));
    return;
  }
  next();
}
