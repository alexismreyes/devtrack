import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { LABEL_COLORS, LABEL_NAME_MAX_LENGTH } from "../domain/project-label";
import type { UpdateLabelRequestDto } from "../dto/label-dtos";

export const updateLabelBodySchema = z
  .object({
    name: z.string().trim().min(1).max(LABEL_NAME_MAX_LENGTH).optional(),
    color: z.enum(LABEL_COLORS).optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one field is required",
  })
  .transform((data): UpdateLabelRequestDto => {
    const body: UpdateLabelRequestDto = {};
    if (data.name !== undefined) {
      body.name = data.name;
    }
    if (data.color !== undefined) {
      body.color = data.color;
    }
    return body;
  });

export function validateUpdateLabelBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateLabelBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
