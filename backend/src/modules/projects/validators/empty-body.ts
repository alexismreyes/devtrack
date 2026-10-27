import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const emptyProjectActionBodySchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z.object({}).strict(),
);

export function validateEmptyProjectActionBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = emptyProjectActionBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  next();
}
