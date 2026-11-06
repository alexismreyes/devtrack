import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { SetCoverRequestDto } from "../dto/attachment-dtos";

export const setCoverBodySchema = z
  .object({
    attachmentId: z.uuid(),
  })
  .strict();

export function validateSetCoverBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = setCoverBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid cover body"));
    return;
  }
  (req as Request & { body: SetCoverRequestDto }).body = result.data;
  next();
}
