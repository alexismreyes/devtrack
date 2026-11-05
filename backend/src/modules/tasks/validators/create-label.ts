import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { LABEL_COLORS, LABEL_NAME_MAX_LENGTH } from "../domain/project-label";
import type { CreateLabelRequestDto } from "../dto/label-dtos";

export const createLabelBodySchema = z
  .object({
    name: z.string().trim().min(1).max(LABEL_NAME_MAX_LENGTH),
    color: z.enum(LABEL_COLORS),
  })
  .strict()
  .transform(
    (data): CreateLabelRequestDto => ({
      name: data.name,
      color: data.color,
    }),
  );

export function validateCreateLabelBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createLabelBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
