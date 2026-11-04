import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { UpdateCommentRequestDto } from "../dto/comment-dtos";

export const updateCommentBodySchema = z
  .object({
    body: z.string().trim().min(1),
  })
  .strict()
  .transform((data): UpdateCommentRequestDto => ({
    body: data.body,
  }));

export function validateUpdateCommentBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = updateCommentBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
