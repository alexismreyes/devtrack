import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export const updateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1),
}).strict();

export type UpdateProfileRequestDto = z.infer<typeof updateProfileBodySchema>;

export function validateUpdateProfileBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateProfileBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies UpdateProfileRequestDto;
  next();
}
