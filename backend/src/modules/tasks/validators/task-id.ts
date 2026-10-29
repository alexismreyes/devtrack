import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const taskIdParamSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

export function validateTaskIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = taskIdParamSchema.safeParse(req.params);
  if (!result.success) {
    next(validationError("Invalid task id"));
    return;
  }
  next();
}
