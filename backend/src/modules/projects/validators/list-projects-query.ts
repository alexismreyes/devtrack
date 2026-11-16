import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const listProjectsQuerySchema = z
  .object({
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  })
  .strict();

export type ListProjectsQueryDto = z.infer<typeof listProjectsQuerySchema>;

export function validateListProjectsQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = listProjectsQuerySchema.safeParse(req.query);
  if (!result.success) {
    next(validationError("Invalid request query"));
    return;
  }
  next();
}

export function readListProjectsQuery(req: Request): ListProjectsQueryDto {
  return listProjectsQuerySchema.parse(req.query);
}
