import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { CreateTaskRequestDto } from "../dto/task-dtos";
import { TASK_PRIORITIES, TASK_STATUSES } from "../domain/task";
import { optionalDueDateSchema } from "./calendar-date";

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const createTaskBodySchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.union([z.string(), z.null()]).optional(),
    dueDate: optionalDueDateSchema,
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
  })
  .strict()
  .transform((data): CreateTaskRequestDto => {
    const body: CreateTaskRequestDto = {
      title: data.title,
      description: normalizeDescription(data.description),
      dueDate: data.dueDate === undefined ? null : data.dueDate,
    };
    if (data.status !== undefined) {
      body.status = data.status;
    }
    if (data.priority !== undefined) {
      body.priority = data.priority;
    }
    return body;
  });

export function validateCreateTaskBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createTaskBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
