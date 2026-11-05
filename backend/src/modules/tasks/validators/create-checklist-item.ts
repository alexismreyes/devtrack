import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { CHECKLIST_ITEM_TEXT_MAX_LENGTH } from "../domain/task-checklist";
import type { CreateChecklistItemRequestDto } from "../dto/checklist-dtos";

export const createChecklistItemBodySchema = z
  .object({
    text: z.string().trim().min(1).max(CHECKLIST_ITEM_TEXT_MAX_LENGTH),
  })
  .strict()
  .transform((data): CreateChecklistItemRequestDto => ({
    text: data.text,
  }));

export function validateCreateChecklistItemBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createChecklistItemBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
