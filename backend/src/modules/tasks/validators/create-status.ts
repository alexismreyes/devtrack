import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import {
  STATUS_COLORS,
  STATUS_NAME_MAX_LENGTH,
} from "../domain/project-status";
import type { CreateStatusRequestDto } from "../dto/status-dtos";

export const createStatusBodySchema = z
  .object({
    name: z.string().trim().min(1).max(STATUS_NAME_MAX_LENGTH),
    color: z.enum(STATUS_COLORS),
    isCompleted: z.boolean().optional(),
  })
  .strict()
  .transform((data): CreateStatusRequestDto => {
    const body: CreateStatusRequestDto = {
      name: data.name,
      color: data.color,
    };
    if (data.isCompleted !== undefined) {
      body.isCompleted = data.isCompleted;
    }
    return body;
  });

export function validateCreateStatusBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createStatusBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
