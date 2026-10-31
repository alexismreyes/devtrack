import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const emptyMemberActionBodySchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z.object({}).strict(),
);

export function validateEmptyMemberActionBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = emptyMemberActionBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  next();
}
