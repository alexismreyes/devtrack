import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { PROJECT_MEMBER_ROLES } from "../domain/project-member";
import type { AddMemberRequestDto } from "../dto/member-dtos";

export const addMemberBodySchema = z
  .object({
    email: z.string().trim().pipe(z.email()),
    role: z.enum(PROJECT_MEMBER_ROLES),
  })
  .strict();

export function validateAddMemberBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = addMemberBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies AddMemberRequestDto;
  next();
}
