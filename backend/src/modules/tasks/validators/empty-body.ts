import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const emptyTaskActionBodySchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z.object({}).strict(),
);

export function validateEmptyTaskActionBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = emptyTaskActionBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  next();
}
