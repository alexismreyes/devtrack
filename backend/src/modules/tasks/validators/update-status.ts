import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import {
  STATUS_COLORS,
  STATUS_NAME_MAX_LENGTH,
} from "../domain/project-status";
import type { UpdateStatusRequestDto } from "../dto/status-dtos";

export const updateStatusBodySchema = z
  .object({
    name: z.string().trim().min(1).max(STATUS_NAME_MAX_LENGTH).optional(),
    color: z.enum(STATUS_COLORS).optional(),
    isCompleted: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.color !== undefined ||
      data.isCompleted !== undefined,
    { message: "At least one field is required" },
  )
  .transform((data): UpdateStatusRequestDto => {
    const body: UpdateStatusRequestDto = {};
    if (data.name !== undefined) {
      body.name = data.name;
    }
    if (data.color !== undefined) {
      body.color = data.color;
    }
    if (data.isCompleted !== undefined) {
      body.isCompleted = data.isCompleted;
    }
    return body;
  });

export function validateUpdateStatusBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateStatusBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
