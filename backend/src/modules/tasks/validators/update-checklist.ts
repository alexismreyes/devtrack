import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { CHECKLIST_NAME_MAX_LENGTH } from "../domain/task-checklist";
import type { UpdateChecklistRequestDto } from "../dto/checklist-dtos";

export const updateChecklistBodySchema = z
  .object({
    name: z.string().trim().min(1).max(CHECKLIST_NAME_MAX_LENGTH),
  })
  .strict()
  .transform((data): UpdateChecklistRequestDto => ({
    name: data.name,
  }));

export function validateUpdateChecklistBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateChecklistBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
