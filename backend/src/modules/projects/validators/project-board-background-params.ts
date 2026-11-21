import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const projectIdForBoardBackgroundParamSchema = z
  .object({
    projectId: z.uuid(),
  })
  .strict();

export function validateProjectIdForBoardBackgroundParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = projectIdForBoardBackgroundParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid project id"));
    return;
  }
  next();
}
