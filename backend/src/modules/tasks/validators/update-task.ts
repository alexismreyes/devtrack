import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { UpdateTaskRequestDto } from "../dto/task-dtos";
import { TASK_PRIORITIES, TASK_STATUSES } from "../domain/task";
import { optionalDueDateSchema } from "./calendar-date";

function normalizeDescription(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    dueDate: optionalDueDateSchema,
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined,
    { message: "At least one updatable field is required" },
  )
  .transform((data): UpdateTaskRequestDto => {
    const body: UpdateTaskRequestDto = {};
    if (data.title !== undefined) {
      body.title = data.title;
    }
    if (data.description !== undefined) {
      body.description = normalizeDescription(data.description);
    }
    if (data.dueDate !== undefined) {
      body.dueDate = data.dueDate;
    }
    if (data.status !== undefined) {
      body.status = data.status;
    }
    if (data.priority !== undefined) {
      body.priority = data.priority;
    }
    return body;
  });

export function validateUpdateTaskBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateTaskBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
