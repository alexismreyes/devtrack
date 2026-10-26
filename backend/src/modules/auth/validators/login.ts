import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { LoginRequestDto } from "../dto/auth-dtos";

export const loginBodySchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().trim().min(1),
}).strict();

export function validateLoginBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = loginBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies LoginRequestDto;
  next();
}
