import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const projectIdParamSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export function validateProjectIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = projectIdParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid project id"));
    return;
  }
  next();
}
