import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { CreateCommentRequestDto } from "../dto/comment-dtos";

export const createCommentBodySchema = z
  .object({
    body: z.string().trim().min(1),
  })
  .strict()
  .transform((data): CreateCommentRequestDto => ({
    body: data.body,
  }));

export function validateCreateCommentBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = createCommentBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
