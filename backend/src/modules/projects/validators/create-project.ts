import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { CreateProjectRequestDto } from "../dto/project-dtos";

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const createProjectBodySchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.union([z.string(), z.null()]).optional(),
  })
  .strict()
  .transform(
    (data): CreateProjectRequestDto => ({
      name: data.name,
      description: normalizeDescription(data.description),
    }),
  );

export function validateCreateProjectBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createProjectBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
