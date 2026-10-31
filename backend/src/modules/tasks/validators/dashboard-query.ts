import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const dashboardQuerySchema = z.object({}).strict();

export function validateDashboardQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = dashboardQuerySchema.safeParse(req.query);
  if (!result.success) {
    next(validationError("Invalid request query"));
    return;
  }
  next();
}
