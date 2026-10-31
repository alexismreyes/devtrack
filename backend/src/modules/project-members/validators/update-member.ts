import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { PROJECT_MEMBER_ROLES } from "../domain/project-member";
import type { UpdateMemberRequestDto } from "../dto/member-dtos";

export const updateMemberBodySchema = z
  .object({
    role: z.enum(PROJECT_MEMBER_ROLES),
  })
  .strict();

export function validateUpdateMemberBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateMemberBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data satisfies UpdateMemberRequestDto;
  next();
}
