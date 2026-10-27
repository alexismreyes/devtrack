import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { UpdateProjectRequestDto } from "../dto/project-dtos";

function normalizeDescription(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const updateProjectBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.union([z.string(), z.null()]).optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    { message: "At least one of name or description is required" },
  )
  .transform((data): UpdateProjectRequestDto => {
    const body: UpdateProjectRequestDto = {};
    if (data.name !== undefined) {
      body.name = data.name;
    }
    if (data.description !== undefined) {
      body.description = normalizeDescription(data.description);
    }
    return body;
  });

export function validateUpdateProjectBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateProjectBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
