import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { CHECKLIST_ITEM_TEXT_MAX_LENGTH } from "../domain/task-checklist";
import type { UpdateChecklistItemRequestDto } from "../dto/checklist-dtos";

export const updateChecklistItemBodySchema = z
  .object({
    text: z.string().trim().min(1).max(CHECKLIST_ITEM_TEXT_MAX_LENGTH).optional(),
    checked: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => data.text !== undefined || data.checked !== undefined,
    { message: "At least one of text or checked is required" },
  )
  .transform((data): UpdateChecklistItemRequestDto => {
    const result: UpdateChecklistItemRequestDto = {};
    if (data.text !== undefined) {
      result.text = data.text;
    }
    if (data.checked !== undefined) {
      result.checked = data.checked;
    }
    return result;
  });

export function validateUpdateChecklistItemBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateChecklistItemBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
