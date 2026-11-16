import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { ChangePasswordRequestDto } from "../dto/auth-dtos";

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().trim().min(1),
    newPassword: z.string().trim().min(8),
  })
  .strict()
  .refine((body) => body.newPassword !== body.currentPassword, {
    message: "New password must differ from the current password",
    path: ["newPassword"],
  });

export function validateChangePasswordBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = changePasswordBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies ChangePasswordRequestDto;
  next();
}
