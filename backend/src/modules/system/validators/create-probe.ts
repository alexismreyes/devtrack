import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const createProbeBodySchema = z.preprocess(
  (value) => (value === undefined ? {} : value),
  z.object({}).strict(),
);

export function validateCreateProbeBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createProbeBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  next();
}
