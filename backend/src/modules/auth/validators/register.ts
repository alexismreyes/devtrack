import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { RegisterRequestDto } from "../dto/auth-dtos";

export const registerBodySchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
}).strict();

export function validateRegisterBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = registerBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies RegisterRequestDto;
  next();
}
